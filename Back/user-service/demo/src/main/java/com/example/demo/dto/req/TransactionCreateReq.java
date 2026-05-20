package com.example.demo.dto.req;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record TransactionCreateReq(
        UUID userId,
        UUID cycleId,
        UUID categoryId,
        String txType,
        BigDecimal amount,
        String note,
        LocalDateTime txDate) {
}
