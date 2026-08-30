package com.example.demo.dto.res;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiWeatherWarningRes(String source_model, String summary) {
}
