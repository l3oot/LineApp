package com.example.demo.dto.res;

public record WeatherWarningRes(
        boolean hasWarning,
        String issueNo,
        String titleThai,
        String announceDate,
        String effectStartDate,
        String effectEndDate,
        String summary,
        String webUrlThai,
        String contactThai) {

    public static WeatherWarningRes none() {
        return new WeatherWarningRes(false, null, null, null, null, null, null, null, null);
    }
}
