package com.example.demo.dto.res;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AgriPriceLatestQuoteRes(
        String productName,
        String dateKey,
        double averagePrice,
        String unit,
        int marketCount) {
}
