package com.example.demo.dto.res;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiAgriPriceExtractRes(
        String source_model,
        Boolean isPriceQuestion,
        String productQuery) {
}
