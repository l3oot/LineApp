package com.example.demo.dto.res;

import java.util.UUID;

public class AuthRes {

    private final String token;
    private final UUID userId;
    private final String lineUserId;
    private final String displayName;
    private final String pictureUrl;

    public AuthRes(String token, UUID userId, String lineUserId, String displayName, String pictureUrl) {
        this.token = token;
        this.userId = userId;
        this.lineUserId = lineUserId;
        this.displayName = displayName;
        this.pictureUrl = pictureUrl;
    }

    public String getToken() {
        return token;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getLineUserId() {
        return lineUserId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getPictureUrl() {
        return pictureUrl;
    }
}
