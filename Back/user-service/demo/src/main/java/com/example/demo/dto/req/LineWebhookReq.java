package com.example.demo.dto.req;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Body ที่ LINE POST มาที่ Webhook URL
 *
 * <pre>
 * {
 *   "destination": "Uxxxx...",
 *   "events": [
 *     {
 *       "type": "message",
 *       "replyToken": "abc...",
 *       "source": { "type": "user", "userId": "Uxxxx..." },
 *       "message": { "type": "text", "id": "...", "text": "สวัสดี" },
 *       "timestamp": 1234567890,
 *       "mode": "active"
 *     }
 *   ]
 * }
 * </pre>
 *
 * <p>Verify event: LINE จะ POST มาด้วย {@code events: []} ตอนกด Verify ใน console
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record LineWebhookReq(
        String destination,
        List<Event> events) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Event(
            String type,
            String replyToken,
            Source source,
            Message message,
            Postback postback,
            Long timestamp,
            String mode) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Source(
            String type,
            String userId) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Message(
            String id,
            String type,
            String text) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Postback(
            String data) {
    }
}
