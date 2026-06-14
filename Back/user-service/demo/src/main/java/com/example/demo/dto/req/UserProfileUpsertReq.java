package com.example.demo.dto.req;

import java.util.UUID;

public record UserProfileUpsertReq(
        UUID userId,
        String province,
        String district,
        String subDistrict,
        String mainAgricultureType) {
}
