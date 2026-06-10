package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@ConfigurationProperties(prefix = "line")
@Component
public class LineProperties {

    // ===== LINE Login (OAuth 2.1) =====
    private String clientId;
    private String clientSecret;
    private String redirectUri;

    // ===== Messaging API (Webhook + Reply/Push) =====
    // channelAccessToken: ใช้ใน Authorization: Bearer ตอนเรียก /v2/bot/message/{reply,push}
    // channelSecret: ใช้ verify x-line-signature ของ webhook request (HMAC-SHA256 ของ raw body)
    private String channelAccessToken;
    private String channelSecret;
    /** URL ฐานของ LIFF / Web app — ใช้เปิดหน้าแก้ไขจาก Flex (เช่น https://liff.line.me/xxx หรือ https://app.example.com) */
    private String liffUrl;

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public void setRedirectUri(String redirectUri) {
        this.redirectUri = redirectUri;
    }

    public String getChannelAccessToken() {
        return channelAccessToken;
    }

    public void setChannelAccessToken(String channelAccessToken) {
        this.channelAccessToken = channelAccessToken;
    }

    public String getChannelSecret() {
        return channelSecret;
    }

    public void setChannelSecret(String channelSecret) {
        this.channelSecret = channelSecret;
    }

    public String getLiffUrl() {
        return liffUrl;
    }

    public void setLiffUrl(String liffUrl) {
        this.liffUrl = liffUrl;
    }

    /** คืน base URL ของแอป — ใช้ liff-url ก่อน ถ้าไม่ตั้งจะ derive จาก redirect-uri */
    public String resolveLiffBaseUrl() {
        if (liffUrl != null && !liffUrl.isBlank()) {
            return liffUrl.replaceAll("/+$", "");
        }
        if (redirectUri != null && redirectUri.contains("/callback")) {
            return redirectUri.replaceAll("/callback/?$", "");
        }
        return null;
    }
}
