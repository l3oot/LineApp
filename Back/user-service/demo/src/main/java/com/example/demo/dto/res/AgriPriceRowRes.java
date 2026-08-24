package com.example.demo.dto.res;

public record AgriPriceRowRes(
        String dateKey,
        Double price,
        String unit,
        String productName,
        String marketName,
        String province,
        Integer yearTh,
        String month,
        Integer week) {
}
