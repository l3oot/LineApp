package com.example.demo.dto.res;

import java.time.LocalDateTime;
import java.util.UUID;

public record CropRes(
        UUID cropId,
        UUID userId,
        String name,
        String note,
        String farmType,
        String icon,
        String status,
        Integer startMonth,
        Integer endMonth,
        LocalDateTime createdAt,
        CycleRes currentSeason) {
}
