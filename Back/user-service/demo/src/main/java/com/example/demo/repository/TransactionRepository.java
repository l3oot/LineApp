package com.example.demo.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.TransactionEntity;

public interface TransactionRepository extends JpaRepository<TransactionEntity, UUID> {

    List<TransactionEntity> findByUserIdOrderByTxDateDesc(UUID userId);

    List<TransactionEntity> findByUserIdAndCycleIdOrderByTxDateDesc(UUID userId, UUID cycleId);

    Page<TransactionEntity> findByUserIdOrderByTxDateDesc(UUID userId, Pageable pageable);

    Page<TransactionEntity> findByUserIdAndCycleIdOrderByTxDateDesc(UUID userId, UUID cycleId, Pageable pageable);

    Page<TransactionEntity> findByUserIdAndTxDateBetweenOrderByTxDateDesc(
            UUID userId, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    Page<TransactionEntity> findByUserIdAndCycleIdAndTxDateBetweenOrderByTxDateDesc(
            UUID userId, UUID cycleId, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    void deleteByUserId(UUID userId);
}
