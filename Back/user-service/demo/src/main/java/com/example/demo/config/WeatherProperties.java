package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@ConfigurationProperties(prefix = "weather")
@Component
public class WeatherProperties {

    private String baseUrl = "https://data.tmd.go.th/nwpapi";
    private String token = "";
    private int timeoutSeconds = 20;
    private int durationHours = 24;
    private String warningUrl = "https://data.tmd.go.th/api/WeatherWarningNews/v2/";
    private String warningUid = "demo";
    private String warningUkey = "demokey";

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public int getDurationHours() {
        return durationHours;
    }

    public void setDurationHours(int durationHours) {
        this.durationHours = durationHours;
    }

    public String getWarningUrl() {
        return warningUrl;
    }

    public void setWarningUrl(String warningUrl) {
        this.warningUrl = warningUrl;
    }

    public String getWarningUid() {
        return warningUid;
    }

    public void setWarningUid(String warningUid) {
        this.warningUid = warningUid;
    }

    public String getWarningUkey() {
        return warningUkey;
    }

    public void setWarningUkey(String warningUkey) {
        this.warningUkey = warningUkey;
    }
}
