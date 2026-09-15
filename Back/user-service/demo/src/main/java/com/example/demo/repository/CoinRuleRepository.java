package com.example.demo.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.CoinRuleEntity;
import com.example.demo.enums.CoinRuleCode;

public interface CoinRuleRepository extends JpaRepository<CoinRuleEntity, UUID> {

    Optional<CoinRuleEntity> findByCode(CoinRuleCode code);

    Optional<CoinRuleEntity> findByCodeAndActiveTrue(CoinRuleCode code);
}
