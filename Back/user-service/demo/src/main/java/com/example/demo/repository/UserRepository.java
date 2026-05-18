package com.example.demo.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.repository.CrudRepository;

import com.example.demo.entity.UserEntity;

public interface UserRepository extends CrudRepository<UserEntity, UUID> {

    boolean existsByUserSub(String userSub);
    Optional<UserEntity> findByUserSub(String userSub);

}
