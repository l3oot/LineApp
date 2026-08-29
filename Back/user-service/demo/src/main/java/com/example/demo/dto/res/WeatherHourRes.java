package com.example.demo.dto.res;

public record WeatherHourRes(
        String time,
        int temperatureC,
        int humidityPercent,
        int condition,
        Integer temperatureMinC,
        Integer temperatureMaxC) {
}
