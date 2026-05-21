package com.example.demo.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.LineWebhookReq;
import com.example.demo.dto.req.TransactionCreateReq;
import com.example.demo.dto.res.AiParseRes;
import com.example.demo.dto.res.TransactionRes;
import com.example.demo.entity.UserEntity;
import com.example.demo.repository.UserRepository;

/**
 * Orchestrate flow ของ LINE chatbot:
 *
 * <ol>
 *   <li>upsert UserEntity ตาม LINE userId (source.userId → user_sub)</li>
 *   <li>เรียก ai-service /parse?text=&userId= → AiParseRes</li>
 *   <li>{@code structured_ok=true} → map → insert ลง public.transaction</li>
 *   <li>มี {@code message} (ยายตอบ) → reply ข้อความนั้นกลับ</li>
 *   <li>error → reply fallback</li>
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
 *   tx_date     ← now()
 * </pre>
 *
 * วิ่งบน {@code lineWebhookExecutor} เพื่อไม่ block response 200 ที่ต้องตอบ LINE ทันที
 */
@Service
public class LineWebhookService {

    private static final Logger log = LoggerFactory.getLogger(LineWebhookService.class);

    private final UserRepository userRepository;
    private final AiClientService aiClientService;
    private final LineMessagingService lineMessagingService;
    private final TransactionService transactionService;

    public LineWebhookService(
            UserRepository userRepository,
            AiClientService aiClientService,
            LineMessagingService lineMessagingService,
            TransactionService transactionService) {
        this.userRepository = userRepository;
        this.aiClientService = aiClientService;
        this.lineMessagingService = lineMessagingService;
        this.transactionService = transactionService;
    }

    @Async("lineWebhookExecutor")
    public void handleEvent(LineWebhookReq.Event event) {
        if (event == null) {
            return;
        }
        if (!"message".equals(event.type())) {
            log.debug("skip non-message event: type={}", event.type());
            return;
        }
        LineWebhookReq.Message msg = event.message();
        if (msg == null || !"text".equals(msg.type()) || msg.text() == null || msg.text().isBlank()) {
            log.debug("skip non-text/empty message: {}", msg);
            return;
        }
        LineWebhookReq.Source src = event.source();
        if (src == null || src.userId() == null) {
            log.debug("skip event without source.userId");
            return;
        }

        String userSub = src.userId();
        String userText = msg.text();
        String replyToken = event.replyToken();

        try {
            UserEntity user = upsertUserBySub(userSub);

            AiParseRes parsed = aiClientService.parse(userText, user.getUserId());
            String replyText = decideReply(user, parsed);

            lineMessagingService.reply(replyToken, replyText);

        } catch (Exception e) {
            log.error("LINE webhook handle failed for user={}: {}", userSub, e.getMessage(), e);
            lineMessagingService.reply(replyToken, "ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งจ้ะ");
        }
    }

    /** หา UserEntity ตาม LINE userId — สร้างใหม่ถ้ายังไม่เคย OAuth login */
    @Transactional
    UserEntity upsertUserBySub(String userSub) {
        return userRepository.findByUserSub(userSub).orElseGet(() -> {
            UserEntity fresh = new UserEntity(null, null, userSub, null, LocalDateTime.now());
            return userRepository.save(fresh);
        });
    }

    /** ตัดสินว่าจะ reply อะไรกลับ LINE — และถ้า AI extract ได้ครบ ให้ insert transaction ที่นี่ */
    private String decideReply(UserEntity user, AiParseRes parsed) {
        if (parsed == null) {
            return "ขออภัย ระบบ AI ขัดข้องชั่วคราว ลองพิมพ์ใหม่อีกครั้งนะจ๊ะ";
        }

        if (parsed.structured_ok() && parsed.data() != null) {
            return insertTransactionAndBuildReply(user, parsed.data());
        }

        // ai-service ตอบเป็นข้อความถาม (ยายตอบหลาน) — ใช้ตามนั้น
        if (parsed.message() != null && !parsed.message().isBlank()) {
            return parsed.message();
        }

        return "ขออภัย ฉันยังไม่เข้าใจ ช่วยพิมพ์ใหม่อีกครั้งนะจ๊ะ";
    }

    private String insertTransactionAndBuildReply(UserEntity user, AiParseRes.Data data) {
        if (data.price() == null || data.type() == null || data.main() == null) {
            return "ขออภัย ฉันยังแยกข้อมูลไม่ครบ ช่วยพิมพ์ใหม่อีกครั้งนะจ๊ะ";
        }

        TransactionCreateReq req = new TransactionCreateReq(
                user.getUserId(),
                data.cycleId(),
                data.categoryId(),
                data.type(),
                BigDecimal.valueOf(data.price()),
                data.main(),
                LocalDateTime.now());

        ApiRes<TransactionRes> res = transactionService.createTransaction(req);
        if (!res.success() || res.data() == null) {
            log.warn("createTransaction failed: {}", res.message());
            return "บันทึกไม่สำเร็จ: " + res.message();
        }

        String label = "expense".equalsIgnoreCase(data.type()) ? "รายจ่าย" : "รายรับ";
        StringBuilder reply = new StringBuilder();
        reply.append("บันทึก").append(label).append("เรียบร้อยจ๊ะ\n");
        reply.append("• รายการ: ").append(data.main()).append("\n");
        reply.append("• ราคา: ").append(formatPrice(data.price())).append(" บาท");
        if (data.cycleName() != null) {
            reply.append("\n• รอบ: ").append(data.cycleName());
        }
        if (data.categoryName() != null) {
            reply.append("\n• หมวด: ").append(data.categoryName());
        }
        return reply.toString();
    }

    private static String formatPrice(double price) {
        if (price == Math.floor(price)) {
            return String.format("%,d", (long) price);
        }
        return String.format("%,.2f", price);
    }
}
