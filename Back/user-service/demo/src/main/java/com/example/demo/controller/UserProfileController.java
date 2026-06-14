package com.example.demo.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.UserProfileUpsertReq;
import com.example.demo.dto.res.UserProfileRes;
import com.example.demo.service.UserProfileService;

@RestController
@RequestMapping("/api/user-profile")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping("")
    public ResponseEntity<ApiRes<UserProfileRes>> getProfile(@RequestParam UUID userId) {
        UserProfileRes data = userProfileService.getByUserId(userId);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @PutMapping("")
    public ResponseEntity<ApiRes<UserProfileRes>> upsertProfile(@RequestBody UserProfileUpsertReq req) {
        UserProfileRes data = userProfileService.upsert(req);
        return ResponseEntity.ok(ApiRes.success(data, "Update Success"));
    }
}
