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
@Table(name = "budget_cycle", schema = "public")
public class BudgetCycleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "budget_cycle_id")
    private UUID budgetCycleId;

    @Column(name = "cycle_id", nullable = false)
    private UUID cycleId;

    @Column(name = "amount", nullable = false, precision = 13, scale = 2)
    private BigDecimal amount;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public BudgetCycleEntity() {
    }

    public BudgetCycleEntity(UUID cycleId, BigDecimal amount) {
        this.cycleId = cycleId;
        this.amount = amount;
    }

    public UUID getBudgetCycleId() {
        return budgetCycleId;
    }

    public UUID getCycleId() {
        return cycleId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
