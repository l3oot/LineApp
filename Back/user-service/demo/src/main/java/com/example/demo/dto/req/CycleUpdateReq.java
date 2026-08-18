package com.example.demo.dto.req;

import java.time.LocalDate;
import java.util.UUID;

public record CycleUpdateReq(
        UUID cycleId,
        String name,
        String note,
        String farmType,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        String icon) {
}
