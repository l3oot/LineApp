package com.example.demo.dto.res;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class CycleRes {

    private UUID cycleId;
    private UUID userId;
    private String name;
    private String farmType;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private String icon;
    private LocalDateTime createdAt;

    public CycleRes() {
    }

    public CycleRes(UUID cycleId,
            UUID userId,
            String name,
            String farmType,
            LocalDate startDate,
            LocalDate endDate,
            String status,
            String icon,
            LocalDateTime createdAt) {
        this.cycleId = cycleId;
        this.userId = userId;
        this.name = name;
        this.farmType = farmType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.icon = icon;
        this.createdAt = createdAt;
    }

    public UUID getCycleId() {
        return cycleId;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getFarmType() {
        return farmType;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public String getStatus() {
        return status;
    }

    public String getIcon() {
        return icon;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
