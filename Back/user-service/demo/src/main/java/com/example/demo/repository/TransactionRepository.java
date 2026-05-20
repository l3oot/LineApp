package com.example.demo.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.TransactionEntity;

public interface TransactionRepository extends JpaRepository<TransactionEntity, UUID> {

    List<TransactionEntity> findByUserIdOrderByTxDateDesc(UUID userId);

    List<TransactionEntity> findByUserIdAndCycleIdOrderByTxDateDesc(UUID userId, UUID cycleId);

    void deleteByUserId(UUID userId);
}
