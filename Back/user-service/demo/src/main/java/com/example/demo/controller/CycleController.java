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
import com.example.demo.util.ApiResMapper;

@RestController
@RequestMapping("/api/cycle")
public class CycleController {

    private final CycleService cycleService;

    public CycleController(CycleService cycleService) {
        this.cycleService = cycleService;
    }

    @GetMapping("")
    public ResponseEntity<ApiRes<List<CycleRes>>> getCycles(@RequestParam UUID userId) {
        return ApiResMapper.toResponseEntity(cycleService.getCyclesByUserId(userId));
    }

    /** GET /api/cycle/user/{userId} — รายการรอบของผู้ใช้ */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiRes<List<CycleRes>>> getCyclesByUser(@PathVariable UUID userId) {
        return ApiResMapper.toResponseEntity(cycleService.getCyclesByUserId(userId));
    }

    @GetMapping("/{cycleId}")
    public ResponseEntity<ApiRes<CycleRes>> getCycle(
            @PathVariable UUID cycleId,
            @RequestParam UUID userId) {
        return ApiResMapper.toResponseEntity(cycleService.getCycle(cycleId, userId));
    }

    @PostMapping("")
    public ResponseEntity<ApiRes<CycleRes>> CreateCycle(@RequestBody CycleCreateReq req) {
        return ApiResMapper.toResponseEntity(cycleService.createCycle(req));
    }

    @PutMapping("")
    public ResponseEntity<ApiRes<CycleRes>> updateCycle(@RequestBody CycleUpdateReq req) {
        ApiRes<CycleRes> res = cycleService.updateCycle(req);
        return ApiResMapper.toResponseEntity(res);
    }

    @DeleteMapping("")
    public ResponseEntity<ApiRes<Void>> deleteCycle(
            @RequestParam UUID cycleId,
            @RequestParam UUID userId) {
        return ApiResMapper.toResponseEntity(cycleService.deleteCycle(cycleId, userId));
    }

}
