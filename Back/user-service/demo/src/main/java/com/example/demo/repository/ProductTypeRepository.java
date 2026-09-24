package com.example.demo.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.ProductTypeEntity;

public interface ProductTypeRepository extends JpaRepository<ProductTypeEntity, UUID> {

    List<ProductTypeEntity> findAllByOrderBySortOrderAscNameAsc();
}
