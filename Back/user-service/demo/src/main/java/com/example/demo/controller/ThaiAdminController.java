package com.example.demo.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.res.ThaiAdminOptionRes;
import com.example.demo.service.ThaiAdminService;

@RestController
@RequestMapping("/api/thai-admin")
public class ThaiAdminController {

    private final ThaiAdminService thaiAdminService;

    public ThaiAdminController(ThaiAdminService thaiAdminService) {
        this.thaiAdminService = thaiAdminService;
    }

    @GetMapping("/provinces")
    public ResponseEntity<ApiRes<List<ThaiAdminOptionRes>>> listProvinces() {
        List<ThaiAdminOptionRes> data = thaiAdminService.listProvinces();
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @GetMapping("/districts")
    public ResponseEntity<ApiRes<List<ThaiAdminOptionRes>>> listDistricts(
            @RequestParam String provinceCode) {
        List<ThaiAdminOptionRes> data = thaiAdminService.listDistricts(provinceCode);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @GetMapping("/subdistricts")
    public ResponseEntity<ApiRes<List<ThaiAdminOptionRes>>> listSubdistricts(
            @RequestParam String districtCode) {
        List<ThaiAdminOptionRes> data = thaiAdminService.listSubdistricts(districtCode);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }
}
