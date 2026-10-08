package com.example.demo.service;

import java.util.List;
import java.util.Map;

/**
 * ผลลัพธ์ที่จะส่งกลับ LINE — text หรือ flex หนึ่งชิ้นขึ้นไปใน messages[]
 */
public record LineReply(String text, List<FlexBubble> flexes) {

    public record FlexBubble(Map<String, Object> contents, String altText) {
    }

    public static LineReply text(String message) {
        return new LineReply(message, List.of());
    }

    public static LineReply flex(Map<String, Object> contents, String altText) {
        return new LineReply(null, List.of(new FlexBubble(contents, altText)));
    }

    public static LineReply flexes(FlexBubble first, FlexBubble... rest) {
        if (rest == null || rest.length == 0) {
            return new LineReply(null, List.of(first));
        }
        FlexBubble[] all = new FlexBubble[rest.length + 1];
        all[0] = first;
        System.arraycopy(rest, 0, all, 1, rest.length);
        return new LineReply(null, List.of(all));
    }

    public boolean isFlex() {
        return flexes != null && !flexes.isEmpty();
    }

    public Map<String, Object> flexContents() {
        return isFlex() ? flexes.get(0).contents() : null;
    }

    public String flexAltText() {
        return isFlex() ? flexes.get(0).altText() : null;
    }
}
