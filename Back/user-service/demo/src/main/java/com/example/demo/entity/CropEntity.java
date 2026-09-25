package com.example.demo.entity;

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
@Table(name = "crop", schema = "public")
public class CropEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "crop_id")
    private UUID cropId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "farm_type")
    private String farmType;

    @Column(name = "icon")
    private String icon;

    @Column(name = "note")
    private String note;

    @Column(name = "status", nullable = false)
    private String status;

    /** เดือนเริ่มรอบประจำปี (1-12) — ไม่ผูกปี */
    @Column(name = "start_month")
    private Integer startMonth;

    /** เดือนจบรอบประจำปี (1-12) — ไม่ผูกปี */
    @Column(name = "end_month")
    private Integer endMonth;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public CropEntity() {
    }

    public CropEntity(
            UUID userId,
            String name,
            String farmType,
            String icon,
            String note,
            String status,
            Integer startMonth,
            Integer endMonth) {
        this.userId = userId;
        this.name = name;
        this.farmType = farmType;
        this.icon = icon;
        this.note = note;
        this.status = status;
        this.startMonth = startMonth;
        this.endMonth = endMonth;
    }

    public UUID getCropId() {
        return cropId;
    }

    public void setCropId(UUID cropId) {
        this.cropId = cropId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFarmType() {
        return farmType;
    }

    public void setFarmType(String farmType) {
        this.farmType = farmType;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getStartMonth() {
        return startMonth;
    }

    public void setStartMonth(Integer startMonth) {
        this.startMonth = startMonth;
    }

    public Integer getEndMonth() {
        return endMonth;
    }

    public void setEndMonth(Integer endMonth) {
        this.endMonth = endMonth;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
