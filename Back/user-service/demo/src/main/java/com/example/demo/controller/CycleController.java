package com.example.demo.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.CycleCreateReq;
import com.example.demo.dto.req.CycleUpdateReq;
import com.example.demo.dto.res.CycleCreateRes;
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
        ApiRes<List<CycleRes>> res = cycleService.getCyclesByUserId(userId);
        return ApiResMapper.toResponseEntity(res);
    }

    @PostMapping("")
    public ResponseEntity<ApiRes<CycleCreateRes>> CreateCycle(@RequestBody CycleCreateReq req) {
        ApiRes<CycleCreateRes> res = cycleService.createCycle(req);
        return ApiResMapper.toResponseEntity(res);
    }

    @PutMapping("")
    public ResponseEntity<ApiRes<CycleRes>> updateCycle(@RequestBody CycleUpdateReq req) {
        ApiRes<CycleRes> res = cycleService.updateCycle(req);
        return ApiResMapper.toResponseEntity(res);
    }

    @DeleteMapping("")
    public ResponseEntity<ApiRes<Void>> deleteCycle(@RequestParam UUID cycleId) {
        ApiRes<Void> res = cycleService.deleteCycle(cycleId);
        return ApiResMapper.toResponseEntity(res);
    }

}
