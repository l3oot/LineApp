package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Config ของ ai-service (FastAPI) ที่ user-service เรียกผ่าน HTTP
 *
 * Mapping จาก application.properties / .env:
 *   ai.base-url               → AI_SERVICE_URL
 *   ai.parse-path             → /parse (ไม่ต้อง override ปกติ)
 *   ai.weather-warning-path   → /weather-warning/summarize
 *   ai.timeout-seconds        → 60 (LLM อาจช้าได้)
 */
@ConfigurationProperties(prefix = "ai")
@Component
public class AiServiceProperties {

    private String baseUrl = "http://localhost:8000";
    private String parsePath = "/parse";
    private String weatherWarningPath = "/weather-warning/summarize";
    private String weatherBriefPath = "/weather-brief/summarize";
    private String agriPriceExtractPath = "/agri-price/extract";
    private String agriPriceBriefPath = "/agri-price/summarize";
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

    public String getWeatherWarningPath() {
        return weatherWarningPath;
    }

    public void setWeatherWarningPath(String weatherWarningPath) {
        this.weatherWarningPath = weatherWarningPath;
    }

    public String getWeatherBriefPath() {
        return weatherBriefPath;
    }

    public void setWeatherBriefPath(String weatherBriefPath) {
        this.weatherBriefPath = weatherBriefPath;
    }

    public String getAgriPriceExtractPath() {
        return agriPriceExtractPath;
    }

    public void setAgriPriceExtractPath(String agriPriceExtractPath) {
        this.agriPriceExtractPath = agriPriceExtractPath;
    }

    public String getAgriPriceBriefPath() {
        return agriPriceBriefPath;
    }

    public void setAgriPriceBriefPath(String agriPriceBriefPath) {
        this.agriPriceBriefPath = agriPriceBriefPath;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }
}
