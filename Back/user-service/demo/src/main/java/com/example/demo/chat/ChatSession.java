package com.example.demo.chat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Session แชทชั่วคราวต่อผู้ใช้หนึ่งคน (เก็บใน RAM)
 */
public final class ChatSession {

    private final List<ChatMessage> messages = new ArrayList<>();
    private Instant lastActivity = Instant.now();

    public synchronized List<ChatMessage> snapshot() {
        return List.copyOf(messages);
    }

    public synchronized Instant lastActivity() {
        return lastActivity;
    }

    public synchronized void append(String role, String content, int maxMessages) {
        messages.add(new ChatMessage(role, content));
        lastActivity = Instant.now();
        while (messages.size() > maxMessages) {
            messages.remove(0);
        }
    }

    public synchronized boolean isExpired(Instant cutoff) {
        return lastActivity.isBefore(cutoff);
    }
}
