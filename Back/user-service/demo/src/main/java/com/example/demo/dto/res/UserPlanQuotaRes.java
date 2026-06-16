package com.example.demo.dto.res;

import java.time.LocalDateTime;

public record UserPlanQuotaRes(
        String planName,
        int maxCycles,
        long activeCycles,
        boolean canCreate,
        LocalDateTime expiresAt) {
}
