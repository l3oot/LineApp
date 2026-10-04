package com.example.demo.dto.req;

/**
 * Request body สำหรับ ai-service {@code POST /chat}
 */
public record AiChatReq(
        String user_id,
        String message,
        String locale) {
}
