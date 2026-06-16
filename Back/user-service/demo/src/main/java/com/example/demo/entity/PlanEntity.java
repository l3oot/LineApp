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
@Table(name = "plan", schema = "public")
public class PlanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "plan_id")
    private UUID planId;

    @Column(name = "name", nullable = false, length = 100, unique = true)
    private String name;

    @Column(name = "max_cycles", nullable = false)
    private int maxCycles;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public PlanEntity() {
    }

    public PlanEntity(String name, int maxCycles, BigDecimal price, boolean isActive) {
        this.name = name;
        this.maxCycles = maxCycles;
        this.price = price;
        this.isActive = isActive;
    }

    public UUID getPlanId() {
        return planId;
    }

    public String getName() {
        return name;
    }

    public int getMaxCycles() {
        return maxCycles;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public boolean isActive() {
        return isActive;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
