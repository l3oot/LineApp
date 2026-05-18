package com.example.demo.dto.res;

import java.time.LocalDate;

public class CycleCreateRes {

    private String name;
    private String farmType;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private String icon;

    public CycleCreateRes() {
    }

    public CycleCreateRes(String name,
            String farmType,
            LocalDate startDate,
            LocalDate endDate,
            String status,
            String icon) {
        this.name = name;
        this.farmType = farmType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.icon = icon;
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
}
