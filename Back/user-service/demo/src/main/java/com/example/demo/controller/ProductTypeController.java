package com.example.demo.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.res.ProductTypeRes;
import com.example.demo.service.ProductTypeService;

@RestController
@RequestMapping("/api/product-types")
public class ProductTypeController {

    private final ProductTypeService productTypeService;

    public ProductTypeController(ProductTypeService productTypeService) {
        this.productTypeService = productTypeService;
    }

    @GetMapping("")
    public ResponseEntity<ApiRes<List<ProductTypeRes>>> list() {
        return ResponseEntity.ok(ApiRes.success(productTypeService.listAll(), "OK"));
    }
}
