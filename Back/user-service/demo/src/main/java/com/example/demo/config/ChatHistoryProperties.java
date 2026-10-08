package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Config ของ in-memory chat history (Phase 1)
 *
 * <pre>
 * chat.history.max-messages=20
 * chat.history.ttl-minutes=10
 * chat.history.cleanup-ms=300000
 * </pre>
 */
@ConfigurationProperties(prefix = "chat.history")
@Component
public class ChatHistoryProperties {

    private int maxMessages = 20;
    private int ttlMinutes = 10;
    private long cleanupMs = 300_000L;

    public int getMaxMessages() {
        return maxMessages;
    }

    public void setMaxMessages(int maxMessages) {
        this.maxMessages = maxMessages;
    }

    public int getTtlMinutes() {
        return ttlMinutes;
    }

    public void setTtlMinutes(int ttlMinutes) {
        this.ttlMinutes = ttlMinutes;
    }

    public long getCleanupMs() {
        return cleanupMs;
    }

    public void setCleanupMs(long cleanupMs) {
        this.cleanupMs = cleanupMs;
    }
}
