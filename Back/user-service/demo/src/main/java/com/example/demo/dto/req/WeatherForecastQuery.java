package com.example.demo.dto.req;

public record WeatherForecastQuery(
        String province,
        String amphoe,
        String tambon,
        String date,
        Integer hour,
        Integer duration) {
}
