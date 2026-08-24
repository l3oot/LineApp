package com.example.demo.dto.res;

import java.util.List;

public record AgriPriceSearchRes(
        String period,
        String matchedBy,
        String matchedName,
        int total,
        List<AgriPriceRowRes> items) {
}
