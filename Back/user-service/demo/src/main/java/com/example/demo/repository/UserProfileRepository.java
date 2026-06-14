package com.example.demo.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.UserProfileEntity;

public interface UserProfileRepository extends JpaRepository<UserProfileEntity, UUID> {
}
