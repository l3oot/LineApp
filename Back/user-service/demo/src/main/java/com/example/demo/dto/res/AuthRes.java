package com.example.demo.dto.res;

import java.util.UUID;

public record AuthRes(
        String token,
        UUID userId,
        String lineUserId,
        String displayName,
        String pictureUrl) {
}
