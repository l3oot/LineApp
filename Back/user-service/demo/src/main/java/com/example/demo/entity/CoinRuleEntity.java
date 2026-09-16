package com.example.demo.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.example.demo.enums.CoinRuleCode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "coin_rule", schema = "public")
public class CoinRuleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "coin_rule_id")
    private UUID coinRuleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "code", nullable = false, unique = true, length = 50)
    private CoinRuleCode code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "coin_amount", nullable = false)
    private int coinAmount;

    @Column(name = "daily_limit")
    private Integer dailyLimit;

    @Column(name = "total_limit")
    private Integer totalLimit;

    @Column(name = "active", nullable = false)
    private boolean active;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public CoinRuleEntity() {
    }

    public CoinRuleEntity(
            CoinRuleCode code,
            String name,
            String description,
            int coinAmount,
            Integer dailyLimit,
            boolean active) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.coinAmount = coinAmount;
        this.dailyLimit = dailyLimit;
        this.active = active;
    }

    public UUID getCoinRuleId() {
        return coinRuleId;
    }

    public CoinRuleCode getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public int getCoinAmount() {
        return coinAmount;
    }

    public Integer getDailyLimit() {
        return dailyLimit;
    }

    public Integer getTotalLimit() {
        return totalLimit;
    }

    public boolean isActive() {
        return active;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
