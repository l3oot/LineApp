package com.example.demo.chat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.demo.config.ChatHistoryProperties;

/**
 * In-memory chat history ต่อ userId — TTL + max messages (ไม่ใช้ Redis/DB)
 */
@Service
public class ChatHistoryService {

    private static final Logger log = LoggerFactory.getLogger(ChatHistoryService.class);

    private final ConcurrentHashMap<UUID, ChatSession> sessions = new ConcurrentHashMap<>();
    private final ChatHistoryProperties props;

    public ChatHistoryService(ChatHistoryProperties props) {
        this.props = props;
    }

    /**
     * คืน history ที่ยังไม่หมดอายุ (ไม่รวมข้อความที่กำลังจะส่งเป็น message ใหม่ถ้ายังไม่ append)
     */
    public List<ChatMessage> getRecent(UUID userId) {
        if (userId == null) {
            return List.of();
        }
        ChatSession session = sessions.get(userId);
        if (session == null) {
            return List.of();
        }
        if (session.isExpired(cutoff())) {
            sessions.remove(userId, session);
            return List.of();
        }
        return session.snapshot();
    }

    /**
     * เพิ่มข้อความและอัปเดต lastActivity — trim ให้เหลือไม่เกิน maxMessages
     */
    public void append(UUID userId, String role, String content) {
        if (userId == null || role == null || role.isBlank()) {
            return;
        }
        String text = content == null ? "" : content.strip();
        if (text.isEmpty()) {
            return;
        }
        ChatSession session = sessions.computeIfAbsent(userId, id -> new ChatSession());
        session.append(role, text, Math.max(1, props.getMaxMessages()));
    }

    /**
     * history สำหรับส่ง AI = ข้อความก่อนหน้า (ไม่รวม user message ล่าสุดที่เพิ่ง append)
     */
    public List<ChatMessage> getHistoryBeforeLatest(UUID userId) {
        List<ChatMessage> all = getRecent(userId);
        if (all.size() <= 1) {
            return List.of();
        }
        return all.subList(0, all.size() - 1);
    }

    public int cleanupExpired() {
        Instant cut = cutoff();
        int removed = 0;
        for (Map.Entry<UUID, ChatSession> entry : sessions.entrySet()) {
            ChatSession session = entry.getValue();
            if (session != null && session.isExpired(cut) && sessions.remove(entry.getKey(), session)) {
                removed++;
            }
        }
        if (removed > 0) {
            log.info("chat-history cleanup removed={} remaining={}", removed, sessions.size());
        }
        return removed;
    }

    /** สำหรับทดสอบ */
    int sessionCount() {
        return sessions.size();
    }

    private Instant cutoff() {
        return Instant.now().minus(Math.max(1, props.getTtlMinutes()), ChronoUnit.MINUTES);
    }
}
