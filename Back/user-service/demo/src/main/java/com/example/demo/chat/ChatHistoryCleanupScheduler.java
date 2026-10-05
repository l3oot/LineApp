package com.example.demo.chat;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * ลบ chat session ที่หมดอายุตาม TTL
 */
@Component
public class ChatHistoryCleanupScheduler {

    private final ChatHistoryService chatHistoryService;

    public ChatHistoryCleanupScheduler(ChatHistoryService chatHistoryService) {
        this.chatHistoryService = chatHistoryService;
    }

    @Scheduled(fixedRateString = "${chat.history.cleanup-ms:300000}")
    public void cleanupSessions() {
        chatHistoryService.cleanupExpired();
    }
}
