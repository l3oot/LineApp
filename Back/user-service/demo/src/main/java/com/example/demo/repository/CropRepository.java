package com.example.demo.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.CropEntity;

public interface CropRepository extends JpaRepository<CropEntity, UUID> {

    List<CropEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    boolean existsByUserIdAndNameIgnoreCase(UUID userId, String name);

    boolean existsByUserIdAndNameIgnoreCaseAndCropIdNot(UUID userId, String name, UUID cropId);

    long countByUserIdAndStatus(UUID userId, String status);
}
