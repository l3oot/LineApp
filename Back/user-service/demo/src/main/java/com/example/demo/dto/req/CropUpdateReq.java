package com.example.demo.dto.req;

import java.util.UUID;

public record CropUpdateReq(
        UUID cropId,
        String name,
        String note,
        String farmType,
        String icon,
        String status,
        Integer startMonth,
        Integer endMonth) {
}
