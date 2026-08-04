package com.example.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.LineTokenReq;
import com.example.demo.dto.res.AuthRes;
import com.example.demo.service.LineAuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final LineAuthService lineAuthService;

    public AuthController(LineAuthService lineAuthService) {
        this.lineAuthService = lineAuthService;
    }

    @PostMapping("/line")
    public ResponseEntity<ApiRes<AuthRes>> lineLogin(@RequestBody LineTokenReq req) {
        AuthRes data = lineAuthService.loginWithLine(req.code());
        return ResponseEntity.ok(ApiRes.success(data, "Login Success"));
    }

    test
}
