package com.example.demo.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.CropCreateReq;
import com.example.demo.dto.req.CropUpdateReq;
import com.example.demo.dto.res.CropRes;
import com.example.demo.service.CropService;

@RestController
@RequestMapping("/api/crop")
public class CropController {

    private final CropService cropService;

    public CropController(CropService cropService) {
        this.cropService = cropService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiRes<List<CropRes>>> getCropsByUser(@PathVariable UUID userId) {
        List<CropRes> data = cropService.getCropsByUserId(userId);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @GetMapping("/{cropId}")
    public ResponseEntity<ApiRes<CropRes>> getCrop(
            @PathVariable UUID cropId,
            @RequestParam UUID userId) {
        CropRes data = cropService.getCrop(cropId, userId);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @PostMapping("")
    public ResponseEntity<ApiRes<CropRes>> createCrop(@RequestBody CropCreateReq req) {
        CropRes data = cropService.createCrop(req);
        return ResponseEntity.ok(ApiRes.success(data, "Insert Success"));
    }

    @PutMapping("")
    public ResponseEntity<ApiRes<CropRes>> updateCrop(@RequestBody CropUpdateReq req) {
        CropRes data = cropService.updateCrop(req);
        return ResponseEntity.ok(ApiRes.success(data, "Update Success"));
    }

    @DeleteMapping("")
    public ResponseEntity<ApiRes<Void>> deleteCrop(
            @RequestParam UUID cropId,
            @RequestParam UUID userId) {
        cropService.deleteCrop(cropId, userId);
        return ResponseEntity.ok(ApiRes.success(null, "Delete Success"));
    }
}
