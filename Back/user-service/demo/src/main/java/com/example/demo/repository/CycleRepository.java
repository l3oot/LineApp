package com.example.demo.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.CycleEntity;

public interface CycleRepository extends JpaRepository<CycleEntity, UUID> {

    boolean existsByName(String name);

    boolean existsByNameAndCycleIdNot(String name, UUID cycleId);

    List<CycleEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
