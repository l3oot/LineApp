package com.example.demo.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.res.UserPlanQuotaRes;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.service.UserPlanService;

@RestController
@RequestMapping("/api/plan")
public class PlanController {

    private final UserPlanService userPlanService;

    public PlanController(UserPlanService userPlanService) {
        this.userPlanService = userPlanService;
    }

    @GetMapping("/quota")
    public ResponseEntity<ApiRes<UserPlanQuotaRes>> getQuota(@RequestParam UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        UserPlanQuotaRes data = userPlanService.getQuota(userId);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }
}
