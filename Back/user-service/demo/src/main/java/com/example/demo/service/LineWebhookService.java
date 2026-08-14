package com.example.demo.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.config.LineProperties;
import com.example.demo.dto.req.LineWebhookReq;
import com.example.demo.exception.ApiException;
import com.example.demo.dto.req.TransactionCreateReq;
import com.example.demo.dto.res.LineProfileRes;
import com.example.demo.dto.res.AiParseRes;
import com.example.demo.dto.res.TransactionRes;
import com.example.demo.entity.UserEntity;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.AppTime;

/**
 * Orchestrate flow ของ LINE chatbot:
 *
 * <ol>
 * <li>upsert UserEntity ตาม LINE userId (source.userId → user_sub)</li>
 * <li>เรียก ai-service /parse?text=&userId= → AiParseRes</li>
 * <li>{@code structured_ok=true} → map → insert ลง public.transaction → ส่ง
 * Flex Message</li>
 * <li>มี {@code message} (ยายตอบ) → reply ข้อความนั้นกลับ</li>
 * <li>error → reply fallback</li>
 * </ol>
 *
 * Mapping AI → transaction:
 * <pre>
 *   user_id     ← UserEntity.userId (lookup จาก source.userId)
 *   cycle_id    ← data.cycleId
 *   category_id ← data.categoryId
 *   tx_type     ← data.type    (expense | income)
 *   amount      ← data.price
 *   note        ← data.main
 *   tx_date     ← event timestamp (Asia/Bangkok)
 * </pre>
 *
 * วิ่งบน {@code lineWebhookExecutor} เพื่อไม่ block response 200 ที่ต้องตอบ
 * LINE ทันที
 */
@Service
public class LineWebhookService {

    private static final Logger log = LoggerFactory.getLogger(LineWebhookService.class);

    private final UserRepository userRepository;
    private final AiClientService aiClientService;
    private final LineMessagingService lineMessagingService;
    private final LineFlexMessageBuilder lineFlexMessageBuilder;
    private final TransactionService transactionService;
    private final LineProperties lineProperties;

    public LineWebhookService(
            UserRepository userRepository,
            AiClientService aiClientService,
            LineMessagingService lineMessagingService,
            LineFlexMessageBuilder lineFlexMessageBuilder,
            TransactionService transactionService,
            LineProperties lineProperties) {
        this.userRepository = userRepository;
        this.aiClientService = aiClientService;
        this.lineMessagingService = lineMessagingService;
        this.lineFlexMessageBuilder = lineFlexMessageBuilder;
        this.transactionService = transactionService;
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

        if ("postback".equals(event.type())) {
            handlePostback(userSub, event.postback(), replyToken);
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
        long timestampMs = Optional.ofNullable(event.timestamp()).orElseGet(System::currentTimeMillis);

        if ("แนะนำ".equals(userText.trim())) {
            lineMessagingService.replyFlex(
                    replyToken,
                    "วิธีพิมพ์ข้อความบันทึกรายการ",
                    lineFlexMessageBuilder.buildHelpContents());
            return;
        }

        try {
            UserEntity user = upsertUserBySub(userSub);

            AiParseRes parsed = aiClientService.parse(userText, user.getUserId());
            LineReply reply = decideReply(user, parsed, timestampMs);

            lineMessagingService.send(reply, replyToken);

        } catch (Exception e) {
            log.error("LINE webhook handle failed for user={}: {}", userSub, e.getMessage(), e);
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
        LineProfileRes profile = lineMessagingService.getUserProfile(userSub);

        UserEntity user = userRepository.findByUserSub(userSub).orElse(null);
        if (user == null) {
            UserEntity fresh = new UserEntity(
                    null,
                    profile != null ? profile.pictureUrl() : null,
                    userSub,
                    profile != null ? profile.displayName() : null,
                    LocalDateTime.now());
            return userRepository.save(fresh);
        }
 
        user.setLastLoginAt(LocalDateTime.now());
        if (profile != null) {
            if (profile.pictureUrl() != null) {
                user.setUserPicture(profile.pictureUrl());
            }
            if (profile.displayName() != null) {
                user.setUserName(profile.displayName());
            }
        }
        return userRepository.save(user);
    }

    /**
     * ตัดสินว่าจะ reply อะไรกลับ LINE — และถ้า AI extract ได้ครบ ให้ insert
     * transaction ที่นี่
     */
    private LineReply decideReply(UserEntity user, AiParseRes parsed, long timestampMs) {
        if (parsed == null) {
            return LineReply.text("ยายขอโทษน้า ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะจ๊ะ");
        }

        if (parsed.structured_ok() && parsed.data() != null) {
            return insertTransactionAndBuildReply(user, parsed.data(), timestampMs);
        }

        // ai-service ตอบเป็นข้อความถาม (ยายตอบหลาน) — ใช้ตามนั้น
        if (parsed.message() != null && !parsed.message().isBlank()) {
            return LineReply.text(parsed.message());
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
            log.info("sending flex for txType={} txId={}", data.type(), saved.txId());
            return LineReply.flex(
                    lineFlexMessageBuilder.buildTransactionBubble(
                            data,
                            saved,
                            timestampMs,
                            lineProperties.resolveLiffBaseUrl()),
                    lineFlexMessageBuilder.buildAltText(data));
        } catch (ApiException e) {
            log.warn("createTransaction failed: {}", e.getMessage());
            return LineReply.text("บันทึกไม่สำเร็จจ้า ลองใหม่อีกครั้งนะจ๊ะ");
        }
    }
}
