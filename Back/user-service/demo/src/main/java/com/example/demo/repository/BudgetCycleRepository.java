package com.example.demo.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.BudgetCycleEntity;

public interface BudgetCycleRepository extends JpaRepository<BudgetCycleEntity, UUID> {

    Optional<BudgetCycleEntity> findFirstByCycleIdOrderByCreatedAtDesc(UUID cycleId);
}
