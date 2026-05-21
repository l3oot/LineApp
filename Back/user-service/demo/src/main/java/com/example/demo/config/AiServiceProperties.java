package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Config ของ ai-service (FastAPI) ที่ user-service เรียกผ่าน HTTP
 *
 * Mapping จาก application.yml:
 *   ai.base-url        → AI_SERVICE_URL
 *   ai.parse-path      → /parse (ไม่ต้อง override ปกติ)
 *   ai.timeout-seconds → 60 (LLM อาจช้าได้)
 */
@ConfigurationProperties(prefix = "ai")
@Component
public class AiServiceProperties {

    private String baseUrl = "http://localhost:8000";
    private String parsePath = "/parse";
    private int timeoutSeconds = 60;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getParsePath() {
        return parsePath;
    }

    public void setParsePath(String parsePath) {
        this.parsePath = parsePath;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }
}
