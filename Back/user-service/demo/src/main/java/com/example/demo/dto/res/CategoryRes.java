package com.example.demo.dto.res;

import java.time.LocalDateTime;
import java.util.UUID;

public class CategoryRes {

    private UUID categoryId;
    private UUID userId;
    private String name;
    private String type;
    private LocalDateTime createdAt;

    public CategoryRes() {
    }

    public CategoryRes(UUID categoryId, UUID userId, String name, String type, LocalDateTime createdAt) {
        this.categoryId = categoryId;
        this.userId = userId;
        this.name = name;
        this.type = type;
        this.createdAt = createdAt;
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
