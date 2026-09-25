package com.example.demo.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.CycleEntity;

public interface CycleRepository extends JpaRepository<CycleEntity, UUID> {

    List<CycleEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<CycleEntity> findByCropIdOrderByCreatedAtDesc(UUID cropId);

    List<CycleEntity> findByCropIdAndStatus(UUID cropId, String status);

    long countByUserIdAndStatus(UUID userId, String status);
}
