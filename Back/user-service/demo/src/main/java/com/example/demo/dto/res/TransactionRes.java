package com.example.demo.dto.res;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record TransactionRes(
        UUID txId,
        UUID userId,
        UUID cycleId,
        UUID categoryId,
        String txType,
        BigDecimal amount,
        String note,
        String icon,
        LocalDateTime txDate,
        LocalDateTime createdAt) {
}
