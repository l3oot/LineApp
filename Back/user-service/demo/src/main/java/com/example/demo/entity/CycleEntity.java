package com.example.demo.entity;

import java.time.LocalDate;
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
@Table(name = "cycle")
public class CycleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "cycle_id")
    private UUID cycleId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "icon")
    private String icon;

    @Column(name = "name")
    private String name;

    @Column(name = "note")
    private String note;

    @Column(name = "farm_type")
    private String farmType;

    @Column(name = "status")
    private String status;

    // ===== constructor =====
    public CycleEntity() {
    }

    public CycleEntity(UUID userId,
            LocalDate startDate,
            LocalDate endDate,
            String icon,
            String name,
            String note,
            String farmType,
            String status) {
        this.userId = userId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.icon = icon;
        this.name = name;
        this.note = note;
        this.farmType = farmType;
        this.status = status;
    }

    // ===== getters =====
    public UUID getCycleId() {
        return cycleId;
    }

    public UUID getUserId() {
        return userId;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getIcon() {
        return icon;
    }

    public String getName() {
        return name;
    }

    public String getNote() {
        return note;
    }

    public String getFarmType() {
        return farmType;
    }

    public String getStatus() {
        return status;
    }

    // ===== setters =====
    public void setCycleId(UUID cycleId) {
        this.cycleId = cycleId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public void setFarmType(String farmType) {
        this.farmType = farmType;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
