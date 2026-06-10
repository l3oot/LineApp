package com.example.demo.service;

import java.util.Map;

/**
 * ผลลัพธ์ที่จะส่งกลับ LINE — text หรือ flex bubble
 */
public record LineReply(String text, Map<String, Object> flexContents, String flexAltText) {

    public static LineReply text(String message) {
        return new LineReply(message, null, null);
    }

    public static LineReply flex(Map<String, Object> contents, String altText) {
        return new LineReply(null, contents, altText);
    }

    public boolean isFlex() {
        return flexContents != null;
    }
}
