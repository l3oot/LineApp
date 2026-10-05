package com.example.demo.dto.req;

import java.util.List;

/**
 * Request body สำหรับ ai-service {@code POST /chat}
 */
public record AiChatReq(
        String user_id,
        String message,
        String locale,
        List<ChatTurn> history) {

    public record ChatTurn(String role, String content) {
    }
}
