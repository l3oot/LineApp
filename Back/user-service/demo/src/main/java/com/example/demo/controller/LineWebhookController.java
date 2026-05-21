package com.example.demo.controller;

import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.req.LineWebhookReq;
import com.example.demo.service.LineSignatureService;
import com.example.demo.service.LineWebhookService;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Webhook endpoint สำหรับ LINE Messaging API
 *
 * <p>ใส่ URL นี้ที่ Channel > Messaging API tab > Webhook URL เช่น
 * {@code https://<ngrok-id>.ngrok-free.app/webhook}
 *
 * <p>Flow:
 * <ol>
 *   <li>รับ raw byte body (จำเป็นสำหรับคำนวณ HMAC ที่ตรงกับ LINE)</li>
 *   <li>verify x-line-signature</li>
 *   <li>parse JSON เป็น {@link LineWebhookReq}</li>
 *   <li>dispatch แต่ละ event ไป {@link LineWebhookService#handleEvent} แบบ async</li>
 *   <li>ตอบ 200 ทันที (ห้ามรอ AI ไม่งั้น LINE retry และ replyToken หมดอายุ ~1 นาที)</li>
 * </ol>
 */
@RestController
@RequestMapping
public class LineWebhookController {

    private static final Logger log = LoggerFactory.getLogger(LineWebhookController.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final LineSignatureService lineSignatureService;
    private final LineWebhookService lineWebhookService;

    public LineWebhookController(
            LineSignatureService lineSignatureService,
            LineWebhookService lineWebhookService) {
        this.lineSignatureService = lineSignatureService;
        this.lineWebhookService = lineWebhookService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody(required = false) byte[] rawBody,
            @RequestHeader(value = "x-line-signature", required = false) String signature) {

        if (rawBody == null || rawBody.length == 0) {
            log.warn("webhook called with empty body");
            return ResponseEntity.ok().build();
        }

        if (!lineSignatureService.verify(rawBody, signature)) {
            log.warn("invalid LINE signature — rejecting request");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            String json = new String(rawBody, StandardCharsets.UTF_8);
            log.debug("LINE webhook body: {}", json);
            LineWebhookReq req = MAPPER.readValue(json, LineWebhookReq.class);
            if (req.events() != null) {
                for (LineWebhookReq.Event event : req.events()) {
                    lineWebhookService.handleEvent(event);
                }
            }
        } catch (Exception e) {
            // ห้าม return error — LINE จะ retry แล้ว replyToken หมดอายุ ตอบ 200 แล้ว log ไว้
            log.error("LINE webhook parse failed: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok().build();
    }
}
