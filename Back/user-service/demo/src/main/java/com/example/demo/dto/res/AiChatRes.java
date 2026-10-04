package com.example.demo.dto.res;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Response ของ ai-service {@code POST /chat}
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiChatRes(
        String reply_text,
        List<Action> actions,
        List<String> tools_used,
        String source_model) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Action(
            String type,
            Map<String, Object> payload) {
    }

    /**
     * map payload ของ create_transaction → รูปแบบเดียวกับ AiParseRes.Data
     */
    public static AiParseRes.Data toParseData(Map<String, Object> payload) {
        if (payload == null) {
            return null;
        }
        return new AiParseRes.Data(
                asString(payload.get("main")),
                asDouble(payload.get("price")),
                asString(payload.get("type")),
                asUuid(payload.get("cycleId")),
                asString(payload.get("cycleName")),
                asUuid(payload.get("categoryId")),
                asString(payload.get("categoryName")),
                asString(payload.get("icon")));
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static Double asDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.valueOf(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static UUID asUuid(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return UUID.fromString(String.valueOf(value));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
