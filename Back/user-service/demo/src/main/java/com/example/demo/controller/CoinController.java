package com.example.demo.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.res.CoinWalletRes;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.service.CoinService;

@RestController
@RequestMapping("/api/coin")
public class CoinController {

    private final CoinService coinService;

    public CoinController(CoinService coinService) {
        this.coinService = coinService;
    }

    @GetMapping("/wallet")
    public ResponseEntity<ApiRes<CoinWalletRes>> getWallet(@RequestParam UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        CoinWalletRes data = coinService.getWallet(userId);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }
}
