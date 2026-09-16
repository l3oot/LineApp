package com.example.demo.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.demo.entity.CoinWalletEntity;

import jakarta.persistence.LockModeType;

public interface CoinWalletRepository extends JpaRepository<CoinWalletEntity, UUID> {

    Optional<CoinWalletEntity> findByUserId(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM CoinWalletEntity w WHERE w.userId = :userId")
    Optional<CoinWalletEntity> findByUserIdForUpdate(@Param("userId") UUID userId);
}
