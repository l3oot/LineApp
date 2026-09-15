package com.example.demo.repository;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.CoinTransactionEntity;

public interface CoinTransactionRepository extends JpaRepository<CoinTransactionEntity, UUID> {

    boolean existsByUserIdAndCoinRuleIdAndEarnDate(UUID userId, UUID coinRuleId, LocalDate earnDate);
}
