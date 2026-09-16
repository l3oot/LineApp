package com.example.demo.dto.res;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiAgriPriceMatchRes(String source_model, List<String> matchedNames) {
}
