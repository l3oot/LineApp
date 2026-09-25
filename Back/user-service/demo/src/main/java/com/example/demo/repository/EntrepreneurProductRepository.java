package com.example.demo.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.EntrepreneurProductEntity;

public interface EntrepreneurProductRepository extends JpaRepository<EntrepreneurProductEntity, UUID> {

    List<EntrepreneurProductEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<EntrepreneurProductEntity> findAllByOrderByCreatedAtDesc();
}
