package com.example.demo.dto.res;

import java.time.LocalDateTime;
import java.util.UUID;

public record CategoryRes(
        UUID categoryId,
        UUID userId,
        String name,
        String type,
        LocalDateTime createdAt) {
}
