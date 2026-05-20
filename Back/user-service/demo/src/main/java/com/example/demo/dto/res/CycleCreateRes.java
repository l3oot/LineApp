package com.example.demo.dto.res;

import java.time.LocalDate;

public record CycleCreateRes(
        String name,
        String farmType,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        String icon) {
}
