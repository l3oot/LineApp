package com.example.demo.dto.res;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserProfileRes(
        UUID userId,
        String province,
        String district,
        String subDistrict,
        String mainAgricultureType,
        LocalDateTime updatedAt) {
}
