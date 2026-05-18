package com.example.demo.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.CategoryEntity;

public interface CategoryRepository extends JpaRepository<CategoryEntity, UUID> {

    List<CategoryEntity> findByUserIdOrderByNameAsc(UUID userId);

    List<CategoryEntity> findByUserIdAndTypeOrderByNameAsc(UUID userId, String type);

    boolean existsByUserIdAndName(UUID userId, String name);

    boolean existsByUserIdAndNameAndCategoryIdNot(UUID userId, String name, UUID categoryId);
}
