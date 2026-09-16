package com.example.demo.dto.req;

import java.util.List;

public record AiAgriPriceMatchReq(String productQuery, List<String> productNames) {
}
