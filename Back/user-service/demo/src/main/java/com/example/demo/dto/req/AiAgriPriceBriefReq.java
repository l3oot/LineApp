package com.example.demo.dto.req;

import java.util.List;

import com.example.demo.dto.res.AgriPriceLatestQuoteRes;

public record AiAgriPriceBriefReq(String productQuery, List<AgriPriceLatestQuoteRes> quotes) {
}
