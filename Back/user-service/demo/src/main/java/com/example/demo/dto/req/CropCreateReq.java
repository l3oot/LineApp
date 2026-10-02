package com.example.demo.dto.req;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CropCreateReq(
        UUID userId,
        String name,
        String note,
        String farmType,
        String icon,
        String status,
        Integer startMonth,
        Integer endMonth,
        LocalDate startDate,
        LocalDate endDate,
        String seasonNote,
        BigDecimal budgetAmount) {
}
