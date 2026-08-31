package com.example.demo.dto.res;

import java.util.List;

public record WeatherForecastRes(
        String locationLabel,
        String province,
        String amphoe,
        String tambon,
        WeatherHourRes current,
        List<WeatherHourRes> hours) {
}
