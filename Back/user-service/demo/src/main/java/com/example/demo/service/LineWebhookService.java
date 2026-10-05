package com.example.demo.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.chat.ChatHistoryService;
import com.example.demo.chat.ChatMessage;
import com.example.demo.config.LineProperties;
import com.example.demo.dto.req.LineWebhookReq;
import com.example.demo.exception.ApiException;
import com.example.demo.dto.req.TransactionCreateReq;
import com.example.demo.dto.res.LineProfileRes;
import com.example.demo.dto.res.AiChatRes;
import com.example.demo.dto.res.AiParseRes;
import com.example.demo.dto.res.TransactionRes;
import com.example.demo.entity.UserEntity;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.AiLatency;
import com.example.demo.util.AppTime;

/**
 * Orchestrate flow ของ LINE chatbot:
 *
 * <ol>
 * <li>upsert UserEntity ตาม LINE userId (source.userId → user_sub)</li>
 * <li>เรียก ai-service POST /chat (API Registry + tool calling)</li>
 * <li>action {@code create_transaction} → insert + Flex Message</li>
 * <li>มี {@code reply_text} → reply ข้อความนั้นกลับ</li>
 * <li>error → reply fallback</li>
 * </ol>
 *
 * ยังคง local handlers: postback delete, Edit transaction, เมนู "แนะนำ"
 *
 * วิ่งบน {@code lineWebhookExecutor} เพื่อไม่ block response 200 ที่ต้องตอบ
 * LINE ทันที
 */
@Service
public class LineWebhookService {

    private static final Logger log = LoggerFactory.getLogger(LineWebhookService.class);

    /** จาก liff.sendMessages หลังแก้รายการในแอป — เช่น "Edit transaction: {uuid}" */
    private static final Pattern EDIT_TRANSACTION_PATTERN = Pattern.compile(
            "^Edit transaction:\\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})",
            Pattern.CASE_INSENSITIVE);

    private final UserRepository userRepository;
    private final AiClientService aiClientService;
    private final ChatHistoryService chatHistoryService;
    private final LineMessagingService lineMessagingService;
    private final LineFlexMessageBuilder lineFlexMessageBuilder;
    private final TransactionService transactionService;
    private final LineTransactionNotifyService lineTransactionNotifyService;
    private final LineProperties lineProperties;

    public LineWebhookService(
            UserRepository userRepository,
            AiClientService aiClientService,
            ChatHistoryService chatHistoryService,
            LineMessagingService lineMessagingService,
            LineFlexMessageBuilder lineFlexMessageBuilder,
            TransactionService transactionService,
            LineTransactionNotifyService lineTransactionNotifyService,
            LineProperties lineProperties) {
        this.userRepository = userRepository;
        this.aiClientService = aiClientService;
        this.chatHistoryService = chatHistoryService;
        this.lineMessagingService = lineMessagingService;
        this.lineFlexMessageBuilder = lineFlexMessageBuilder;
        this.transactionService = transactionService;
        this.lineTransactionNotifyService = lineTransactionNotifyService;
        this.lineProperties = lineProperties;
    }

    @Async("lineWebhookExecutor")
    public void handleEvent(LineWebhookReq.Event event) {
        if (event == null) {
            return;
        }

        LineWebhookReq.Source src = event.source();
        if (src == null || src.userId() == null) {
            log.debug("skip event without source.userId");
            return;
        }

        String userSub = src.userId();
        String replyToken = event.replyToken();
        String reqId = AiLatency.current();
        if (reqId == null || reqId.isBlank()) {
            reqId = AiLatency.newRequestId();
            AiLatency.set(reqId);
        }
        long t0 = System.currentTimeMillis();
        long eventTs = Optional.ofNullable(event.timestamp()).orElse(t0);
        long queueMs = Math.max(0, t0 - eventTs);

        try {
            if ("postback".equals(event.type())) {
                handlePostback(userSub, event.postback(), replyToken);
                log.info("[ai-latency] hop=user reqId={} action=done intent=postback lineUser={} totalMs={}",
                        reqId, userSub, System.currentTimeMillis() - t0);
                return;
            }

            if (!"message".equals(event.type())) {
                log.debug("skip unsupported event: type={}", event.type());
                return;
            }
            LineWebhookReq.Message msg = event.message();
            if (msg == null || !"text".equals(msg.type()) || msg.text() == null || msg.text().isBlank()) {
                log.debug("skip non-text/empty message: {}", msg);
                return;
            }

            String userText = msg.text();
            log.info("[ai-latency] hop=user reqId={} action=start intent=line lineUser={} queueMs={} textLen={}",
                    reqId, userSub, queueMs, userText.length());

            Matcher editMatch = EDIT_TRANSACTION_PATTERN.matcher(userText.trim());
            if (editMatch.find()) {
                handleEditTransactionCommand(userSub, editMatch.group(1), replyToken);
                log.info("[ai-latency] hop=user reqId={} action=done intent=edit-tx lineUser={} totalMs={}",
                        reqId, userSub, System.currentTimeMillis() - t0);
                return;
            }

            if ("แนะนำ".equals(userText.trim())) {
                long tReply0 = System.currentTimeMillis();
                lineMessagingService.replyFlex(
                        replyToken,
                        "วิธีพิมพ์ข้อความบันทึกรายการ",
                        lineFlexMessageBuilder.buildHelpContents());
                log.info("[ai-latency] hop=user reqId={} action=done intent=help lineUser={} replyMs={} totalMs={}",
                        reqId, userSub, System.currentTimeMillis() - tReply0, System.currentTimeMillis() - t0);
                return;
            }

            long tUser0 = System.currentTimeMillis();
            UserEntity user = upsertUserBySub(userSub);
            long tUser = System.currentTimeMillis() - tUser0;

            chatHistoryService.append(user.getUserId(), "user", userText);
            List<ChatMessage> history = chatHistoryService.getHistoryBeforeLatest(user.getUserId());

            long tAi0 = System.currentTimeMillis();
            AiChatRes chat = aiClientService.chat(userText, user.getUserId(), history);
            long tAi = System.currentTimeMillis() - tAi0;

            long tSave0 = System.currentTimeMillis();
            LineReply reply = decideChatReply(user, chat, eventTs);
            long tSave = System.currentTimeMillis() - tSave0;

            String assistantText = assistantHistoryText(reply);
            if (assistantText != null) {
                chatHistoryService.append(user.getUserId(), "assistant", assistantText);
            }

            long tReply0 = System.currentTimeMillis();
            lineMessagingService.send(reply, replyToken);
            log.info(
                    "[ai-latency] hop=user reqId={} action=done intent=chat lineUser={} upsertMs={} aiMs={} saveMs={} replyMs={} history={} tools={} totalMs={}",
                    reqId, userSub, tUser, tAi, tSave, System.currentTimeMillis() - tReply0,
                    history.size(),
                    chat == null ? null : chat.tools_used(),
                    System.currentTimeMillis() - t0);
        } catch (Exception e) {
            log.error("[ai-latency] hop=user reqId={} action=fail intent=chat lineUser={} elapsedMs={} error={}",
                    reqId, userSub, System.currentTimeMillis() - t0, e.getMessage(), e);
            lineMessagingService.reply(replyToken, "ยายขอโทษน้า ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะจ๊ะ");
        }
    }

    /**
     * รับข้อความจาก liff.sendMessages หลังแก้ในแอป → Reply Flex card (ไม่ใช้ Push)
     */
    private void handleEditTransactionCommand(String userSub, String txIdRaw, String replyToken) {
        try {
            UserEntity user = upsertUserBySub(userSub);
            UUID txId = UUID.fromString(txIdRaw);
            TransactionRes tx = transactionService.getTransaction(txId, user.getUserId());
            lineTransactionNotifyService.replyUpdatedTransactionCard(replyToken, tx);
        } catch (ApiException e) {
            log.warn("edit-tx reply failed for user={}: {}", userSub, e.getMessage());
            lineMessagingService.reply(replyToken, "หาไม่เจอรายการที่แก้จ้า ลองเปิดจากแอปอีกครั้งนะจ๊ะ");
        } catch (IllegalArgumentException e) {
            lineMessagingService.reply(replyToken, "รหัสรายการไม่ถูกต้อง ลองใหม่อีกครั้งนะจ๊ะ");
        } catch (Exception e) {
            log.error("edit-tx reply failed for user={}: {}", userSub, e.getMessage(), e);
            lineMessagingService.reply(replyToken, "ยายขอโทษน้า ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะจ๊ะ");
        }
    }

    private void handlePostback(String userSub, LineWebhookReq.Postback postback, String replyToken) {
        if (postback == null || postback.data() == null || postback.data().isBlank()) {
            log.debug("skip empty postback");
            return;
        }

        Map<String, String> params = parsePostbackData(postback.data());
        String action = params.get("action");
        String id = params.get("id");

        if ("open_keyboard".equals(action)) {
            return;
        }

        if (!"delete".equals(action) || id == null || id.isBlank()) {
            lineMessagingService.reply(replyToken, "ยายไม่เข้าใจ ลองพิมพ์ใหม่อีกรอบหน่อยนะจ๊ะ");
            return;
        }

        try {
            UserEntity user = upsertUserBySub(userSub);
            UUID txId = UUID.fromString(id);
            transactionService.deleteTransaction(txId, user.getUserId());
            lineMessagingService.reply(replyToken, "ลบรายการเรียบร้อยแล้วจ้า");
        } catch (ApiException e) {
            lineMessagingService.reply(replyToken, "ลบไม่สำเร็จจ้า ลองใหม่อีกครั้งนะจ๊ะ");
        } catch (IllegalArgumentException e) {
            lineMessagingService.reply(replyToken, "รหัสรายการไม่ถูกต้อง  ลองพิมพ์ใหม่อีกรอบหน่อยนะจ๊ะ");
        } catch (Exception e) {
            log.error("postback delete failed for user={}: {}", userSub, e.getMessage(), e);
            lineMessagingService.reply(replyToken, "ยายขอโทษน้า ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะจ๊ะ");
        }
    }

    private static Map<String, String> parsePostbackData(String data) {
        Map<String, String> out = new HashMap<>();
        for (String part : data.split("&")) {
            int eq = part.indexOf('=');
            if (eq > 0) {
                out.put(part.substring(0, eq), part.substring(eq + 1));
            }
        }
        return out;
    }

    /**
     * หา UserEntity ตาม LINE userId — สร้างใหม่ถ้ายังไม่เคย OAuth login
     */
    @Transactional
    UserEntity upsertUserBySub(String userSub) {
        long t0 = System.currentTimeMillis();
        LineProfileRes profile = lineMessagingService.getUserProfile(userSub);
        long tProfile = System.currentTimeMillis() - t0;

        UserEntity user = userRepository.findByUserSub(userSub).orElse(null);
        UserEntity saved;
        if (user == null) {
            UserEntity fresh = new UserEntity(
                    null,
                    profile != null ? profile.pictureUrl() : null,
                    userSub,
                    profile != null ? profile.displayName() : null,
                    LocalDateTime.now());
            saved = userRepository.save(fresh);
        } else {
            user.setLastLoginAt(LocalDateTime.now());
            if (profile != null) {
                if (profile.pictureUrl() != null) {
                    user.setUserPicture(profile.pictureUrl());
                }
                if (profile.displayName() != null) {
                    user.setUserName(profile.displayName());
                }
            }
            saved = userRepository.save(user);
        }
        log.info("[ai-latency] hop=user reqId={} action=upsert-user lineUser={} profileMs={} totalMs={}",
                AiLatency.currentOrDash(), userSub, tProfile, System.currentTimeMillis() - t0);
        return saved;
    }

    /**
     * ข้อความที่เก็บใน history — Flex ใช้ altText สั้น ๆ ไม่เก็บ bubble JSON
     */
    private static String assistantHistoryText(LineReply reply) {
        if (reply == null) {
            return null;
        }
        if (reply.isFlex()) {
            String alt = reply.flexAltText();
            return (alt != null && !alt.isBlank()) ? alt.strip() : "บันทึกรายการแล้ว";
        }
        if (reply.text() != null && !reply.text().isBlank()) {
            return reply.text().strip();
        }
        return null;
    }

    /**
     * ตัดสิน reply จาก POST /chat — create_transaction ยัง persist ที่ Java
     */
    private LineReply decideChatReply(UserEntity user, AiChatRes chat, long timestampMs) {
        if (chat == null) {
            return LineReply.text("ยายขอโทษน้า ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะจ๊ะ");
        }

        if (chat.actions() != null) {
            for (AiChatRes.Action action : chat.actions()) {
                if (action == null || action.type() == null) {
                    continue;
                }
                if ("create_transaction".equals(action.type())) {
                    AiParseRes.Data data = AiChatRes.toParseData(action.payload());
                    if (data != null) {
                        return insertTransactionAndBuildReply(user, data, timestampMs);
                    }
                }
            }
        }

        if (chat.reply_text() != null && !chat.reply_text().isBlank()) {
            return LineReply.text(chat.reply_text());
        }

        return LineReply.text("ยายขอโทษน้า ยายยังไม่เข้าใจ ช่วยพิมพ์ใหม่อีกครั้งนะจ๊ะ");
    }

    private LineReply insertTransactionAndBuildReply(UserEntity user, AiParseRes.Data data, long timestampMs) {
        if (data.price() == null || data.type() == null || data.main() == null) {
            return LineReply.text("ยายขอโทษน้า ยายยังแยกข้อมูลไม่ครบ ช่วยพิมพ์ใหม่อีกครั้งนะจ๊ะ");
        }

        TransactionCreateReq req = new TransactionCreateReq(
                user.getUserId(),
                data.cycleId(),
                data.categoryId(), 
                data.type(),
                BigDecimal.valueOf(data.price()),
                data.main(),
                data.icon(),  
                AppTime.fromEpochMilli(timestampMs));

        try {
            TransactionRes saved = transactionService.createTransaction(req);
            return LineReply.flex(
                    lineFlexMessageBuilder.buildTransactionBubble(
                            data,
                            saved,
                            timestampMs,
                            lineProperties.resolveLiffBaseUrl()),
                    lineFlexMessageBuilder.buildAltText(data, saved));
        } catch (ApiException e) {
            log.warn("createTransaction failed: {}", e.getMessage());
            return LineReply.text("บันทึกไม่สำเร็จจ้า ลองใหม่อีกครั้งนะจ๊ะ");
        }
    }
}
