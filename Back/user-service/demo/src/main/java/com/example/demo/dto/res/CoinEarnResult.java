package com.example.demo.dto.res;

public record CoinEarnResult(int coinsEarned, int walletBalance) {

    public static CoinEarnResult none(int walletBalance) {
        return new CoinEarnResult(0, walletBalance);
    }
}
