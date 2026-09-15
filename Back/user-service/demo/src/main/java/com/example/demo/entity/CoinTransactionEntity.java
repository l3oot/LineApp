package com.example.demo.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import com.example.demo.enums.CoinTransactionType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "coin_transaction",
        schema = "public",
        uniqueConstraints = @UniqueConstraint(
                name = "coin_transaction_user_rule_earn_date_uidx",
                columnNames = { "user_id", "coin_rule_id", "earn_date" }))
public class CoinTransactionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "coin_tx_id")
    private UUID coinTxId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "coin_rule_id")
    private UUID coinRuleId;

    @Column(name = "amount", nullable = false)
    private int amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 32)
    private CoinTransactionType type;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id", length = 100)
    private String referenceId;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "earn_date")
    private LocalDate earnDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    public CoinTransactionEntity() {
    }

    public CoinTransactionEntity(
            UUID userId,
            UUID coinRuleId,
            int amount,
            CoinTransactionType type,
            String referenceType,
            String referenceId,
            String description,
            LocalDate earnDate) {
        this.userId = userId;
        this.coinRuleId = coinRuleId;
        this.amount = amount;
        this.type = type;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.description = description;
        this.earnDate = earnDate;
    }

    public UUID getCoinTxId() {
        return coinTxId;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getCoinRuleId() {
        return coinRuleId;
    }

    public int getAmount() {
        return amount;
    }

    public CoinTransactionType getType() {
        return type;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public String getDescription() {
        return description;
    }

    public LocalDate getEarnDate() {
        return earnDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getExpiredAt() {
        return expiredAt;
    }
}
