package com.example.demo.dto.res;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record CycleRes(
        UUID cycleId,
        UUID userId,
        String name,
        String farmType,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        String icon,
        LocalDateTime createdAt,
        BigDecimal budgetAmount,
        Long dateComeIn) {

}
