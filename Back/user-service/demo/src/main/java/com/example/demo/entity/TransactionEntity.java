package com.example.demo.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "`transaction`", schema = "public")
public class TransactionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "tx_id")
    private UUID txId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "cycle_id")
    private UUID cycleId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "tx_type", nullable = false, length = 32)
    private String txType;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "tx_date", nullable = false)
    private LocalDateTime txDate;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public TransactionEntity() {
    }

    public TransactionEntity(UUID userId,
            UUID cycleId,
            UUID categoryId,
            String txType,
            BigDecimal amount,
            String note,
            LocalDateTime txDate) {
        this.userId = userId;
        this.cycleId = cycleId;
        this.categoryId = categoryId;
        this.txType = txType;
        this.amount = amount;
        this.note = note;
        this.txDate = txDate;
    }

    public UUID getTxId() {
        return txId;
    }

    public void setTxId(UUID txId) {
        this.txId = txId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getCycleId() {
        return cycleId;
    }

    public void setCycleId(UUID cycleId) {
        this.cycleId = cycleId;
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(UUID categoryId) {
        this.categoryId = categoryId;
    }

    public String getTxType() {
        return txType;
    }

    public void setTxType(String txType) {
        this.txType = txType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDateTime getTxDate() {
        return txDate;
    }

    public void setTxDate(LocalDateTime txDate) {
        this.txDate = txDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
