package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@ConfigurationProperties(prefix = "app")
@Component
public class AppProperties {

    /** URL สาธารณะของ backend — ใช้ให้ LINE โหลดรูป static (เช่น /edit.png) */
    private String publicBaseUrl = "http://localhost:8080";

    public String getPublicBaseUrl() {
        return publicBaseUrl;
    }

    public void setPublicBaseUrl(String publicBaseUrl) {
        this.publicBaseUrl = publicBaseUrl;
    }

    public String resolvePublicBaseUrl() {
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            return "http://localhost:8080";
        }
        return publicBaseUrl.replaceAll("/+$", "");
    }
}
