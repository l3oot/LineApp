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
import com.example.demo.dto.req.CycleCreateReq;
import com.example.demo.dto.req.CycleUpdateReq;
import com.example.demo.dto.res.CycleRes;
import com.example.demo.service.CycleService;

@RestController
@RequestMapping("/api/cycle")
public class CycleController {

    private final CycleService cycleService;

    public CycleController(CycleService cycleService) {
        this.cycleService = cycleService;
    }

    @GetMapping("")
    public ResponseEntity<ApiRes<List<CycleRes>>> getCycles(@RequestParam UUID userId) {
        List<CycleRes> data = cycleService.getCyclesByUserId(userId);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiRes<List<CycleRes>>> getCyclesByUser(@PathVariable UUID userId) {
        List<CycleRes> data = cycleService.getCyclesByUserId(userId);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @GetMapping("/{cycleId}")
    public ResponseEntity<ApiRes<CycleRes>> getCycle(
            @PathVariable UUID cycleId,
            @RequestParam UUID userId) {
        CycleRes data = cycleService.getCycle(cycleId, userId);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @PostMapping("")
    public ResponseEntity<ApiRes<CycleRes>> createCycle(@RequestBody CycleCreateReq req) {
        CycleRes data = cycleService.createCycle(req);
        return ResponseEntity.ok(ApiRes.success(data, "Insert Success"));
    }

    @PutMapping("")
    public ResponseEntity<ApiRes<CycleRes>> updateCycle(@RequestBody CycleUpdateReq req) {
        CycleRes data = cycleService.updateCycle(req);
        return ResponseEntity.ok(ApiRes.success(data, "Update Success"));
    }

    @DeleteMapping("")
    public ResponseEntity<ApiRes<Void>> deleteCycle(
            @RequestParam UUID cycleId,
            @RequestParam UUID userId) {
        cycleService.deleteCycle(cycleId, userId);
        return ResponseEntity.ok(ApiRes.success(null, "Delete Success"));
    }
}
