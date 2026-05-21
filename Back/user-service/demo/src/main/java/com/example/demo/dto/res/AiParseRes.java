package com.example.demo.dto.res;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Response ของ ai-service {@code GET /parse?text=...&userId=...}
 *
 * <pre>
 * {
 *   "source_model": "...",
 *   "data": { ...structured... } | null,
 *   "message": "..." | null,
 *   "structured_ok": true | false
 * }
 * </pre>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiParseRes(
        String source_model,
        Data data,
        String message,
        boolean structured_ok) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Data(
            String main,
            Double price,
            String type,
            UUID cycleId,
            String cycleName,
            UUID categoryId,
            String categoryName) {
    }
}
