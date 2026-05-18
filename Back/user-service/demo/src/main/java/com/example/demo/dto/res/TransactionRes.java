package com.example.demo.dto.res;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class TransactionRes {

    private UUID txId;
    private UUID userId;
    private UUID cycleId;
    private UUID categoryId;
    private String txType;
    private BigDecimal amount;
    private String note;
    private LocalDateTime txDate;
    private LocalDateTime createdAt;

    public TransactionRes() {
    }

    public TransactionRes(UUID txId,
            UUID userId,
            UUID cycleId,
            UUID categoryId,
            String txType,
            BigDecimal amount,
            String note,
            LocalDateTime txDate,
            LocalDateTime createdAt) {
        this.txId = txId;
        this.userId = userId;
        this.cycleId = cycleId;
        this.categoryId = categoryId;
        this.txType = txType;
        this.amount = amount;
        this.note = note;
        this.txDate = txDate;
        this.createdAt = createdAt;
    }

    public UUID getTxId() {
        return txId;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getCycleId() {
        return cycleId;
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public String getTxType() {
        return txType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getNote() {
        return note;
    }

    public LocalDateTime getTxDate() {
        return txDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
