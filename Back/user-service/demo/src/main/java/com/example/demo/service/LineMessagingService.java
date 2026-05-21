package com.example.demo.service;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.demo.config.LineProperties;

/**
 * เรียก LINE Messaging API — Reply (ใช้ replyToken จาก webhook) และ Push (ใช้ userId)
 *
 * <p>Reply API: ตอบกลับเมื่อ user ทักมา ฟรี ไม่จำกัด
 * <p>Push API : ส่ง proactive ทุกเมื่อ มี free quota รายเดือน
 */
@Service
public class LineMessagingService {

    private static final Logger log = LoggerFactory.getLogger(LineMessagingService.class);
    private static final String REPLY_URL = "https://api.line.me/v2/bot/message/reply";
    private static final String PUSH_URL = "https://api.line.me/v2/bot/message/push";

    private final LineProperties lineProperties;
    private final RestTemplate restTemplate;

    public LineMessagingService(LineProperties lineProperties, RestTemplate restTemplate) {
        this.lineProperties = lineProperties;
        this.restTemplate = restTemplate;
    }

    /**
     * ตอบกลับ event ที่ user ส่งมา — replyToken ใช้ได้ครั้งเดียว มีอายุ ~1 นาที
     */
    public void reply(String replyToken, String text) {
        if (replyToken == null || replyToken.isBlank()) {
            log.warn("reply skipped: empty replyToken");
            return;
        }
        Map<String, Object> body = Map.of(
                "replyToken", replyToken,
                "messages", List.of(Map.of("type", "text", "text", truncate(text)))
        );
        post(REPLY_URL, body);
    }

    /**
     * Push message หา user โดยตรง (ใช้ userId จาก source.userId / userSub)
     */
    public void push(String userId, String text) {
        if (userId == null || userId.isBlank()) {
            log.warn("push skipped: empty userId");
            return;
        }
        Map<String, Object> body = Map.of(
                "to", userId,
                "messages", List.of(Map.of("type", "text", "text", truncate(text)))
        );
        post(PUSH_URL, body);
    }

    private void post(String url, Map<String, Object> body) {
        String token = lineProperties.getChannelAccessToken();
        if (token == null || token.isBlank()) {
            log.error("LINE channel-access-token ไม่ได้ตั้งค่า — call ไป {} ไม่สำเร็จ", url);
            return;
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
        try {
            restTemplate.postForEntity(url, req, String.class);
        } catch (Exception e) {
            log.error("LINE call {} failed: {}", url, e.getMessage(), e);
        }
    }

    /** LINE จำกัด text message ที่ 5000 ตัวอักษร */
    private static String truncate(String text) {
        if (text == null) {
            return "";
        }
        if (text.length() <= 5000) {
            return text;
        }
        return text.substring(0, 4997) + "...";
    }
}
