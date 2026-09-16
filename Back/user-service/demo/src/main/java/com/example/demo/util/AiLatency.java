package com.example.demo.util;

import org.slf4j.MDC;

/**
 * Correlation id สำหรับไล่ latency ข้าม user-service ↔ ai-service
 * grep {@code [ai-latency]} ใน log ของทั้งสอง service
 */
public final class AiLatency {

    public static final String HEADER = "X-Request-Id";
    public static final String MDC_KEY = "reqId";

    private AiLatency() {
    }

    public static String newRequestId() {
        return java.util.UUID.randomUUID().toString().substring(0, 8);
    }

    public static void set(String reqId) {
        if (reqId != null && !reqId.isBlank()) {
            MDC.put(MDC_KEY, reqId);
        }
    }

    public static String current() {
        return MDC.get(MDC_KEY);
    }

    public static String currentOrDash() {
        String reqId = current();
        return reqId == null || reqId.isBlank() ? "-" : reqId;
    }

    public static void clear() {
        MDC.remove(MDC_KEY);
    }
}
