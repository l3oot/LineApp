package com.example.demo.dto.res;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiCycleSummaryRes(String source_model, String summary) {
}
