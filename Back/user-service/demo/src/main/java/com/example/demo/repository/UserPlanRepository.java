package com.example.demo.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.demo.entity.UserPlanEntity;

import jakarta.persistence.LockModeType;

public interface UserPlanRepository extends JpaRepository<UserPlanEntity, UUID> {

    boolean existsByUserIdAndStatus(UUID userId, String status);

    Optional<UserPlanEntity> findByUserIdAndStatus(UUID userId, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT up FROM UserPlanEntity up WHERE up.userId = :userId AND up.status = :status")
    Optional<UserPlanEntity> findByUserIdAndStatusForUpdate(
            @Param("userId") UUID userId,
            @Param("status") String status);
}
