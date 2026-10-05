package com.example.demo.chat;

/**
 * ข้อความหนึ่งรายการใน in-memory chat history
 */
public record ChatMessage(String role, String content) {
}
