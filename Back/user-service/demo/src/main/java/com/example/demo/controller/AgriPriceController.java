package com.example.demo.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.res.AgriPriceSearchRes;
import com.example.demo.service.AgriPriceClientService;

@RestController
@RequestMapping("/api/agri-prices")
public class AgriPriceController {

    private final AgriPriceClientService agriPriceClientService;

    public AgriPriceController(AgriPriceClientService agriPriceClientService) {
        this.agriPriceClientService = agriPriceClientService;
    }

    @GetMapping("/product-names")
    public ResponseEntity<ApiRes<List<String>>> listProductNames() {
        List<String> data = agriPriceClientService.listProductNames();
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiRes<AgriPriceSearchRes>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "daily") String period) {
        AgriPriceSearchRes data = agriPriceClientService.search(q, period);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }
}
