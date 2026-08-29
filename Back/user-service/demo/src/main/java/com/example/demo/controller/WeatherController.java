package com.example.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.WeatherForecastQuery;
import com.example.demo.dto.res.WeatherForecastRes;
import com.example.demo.service.WeatherClientService;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {

    private final WeatherClientService weatherClientService;

    public WeatherController(WeatherClientService weatherClientService) {
        this.weatherClientService = weatherClientService;
    }

    @GetMapping("/forecast")
    public ResponseEntity<ApiRes<WeatherForecastRes>> forecast(
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String amphoe,
            @RequestParam(required = false) String tambon,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Integer hour,
            @RequestParam(required = false) Integer duration) {
        WeatherForecastRes data = weatherClientService.forecast(
                new WeatherForecastQuery(province, amphoe, tambon, date, hour, duration));
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @GetMapping("/forecast/daily")
    public ResponseEntity<ApiRes<WeatherForecastRes>> forecastDaily(
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String amphoe,
            @RequestParam(required = false) String tambon,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Integer duration) {
        WeatherForecastRes data = weatherClientService.forecastDaily(
                new WeatherForecastQuery(province, amphoe, tambon, date, null, duration));
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }
}
