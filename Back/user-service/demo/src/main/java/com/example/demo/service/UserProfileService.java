package com.example.demo.service;

import java.util.UUID;

import org.springframework.stereotype.Service;

import com.example.demo.dto.req.UserProfileUpsertReq;
import com.example.demo.dto.res.UserProfileRes;
import com.example.demo.entity.UserProfileEntity;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.repository.UserProfileRepository;
import com.example.demo.repository.UserRepository;

@Service
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserRepository userRepository;

    public UserProfileService(UserProfileRepository userProfileRepository, UserRepository userRepository) {
        this.userProfileRepository = userProfileRepository;
        this.userRepository = userRepository;
    }

    public UserProfileRes getByUserId(UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        if (!userRepository.existsById(userId)) {
            throw new ApiException(ErrorCode.USER_NOT_FOUND, "User not found");
        }
        return userProfileRepository.findById(userId)
                .map(this::toRes)
                .orElse(new UserProfileRes(userId, null, null, null, null, null));
    }

    public UserProfileRes upsert(UserProfileUpsertReq req) {
        if (req.userId() == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        if (!userRepository.existsById(req.userId())) {
            throw new ApiException(ErrorCode.USER_NOT_FOUND, "User not found");
        }

        UserProfileEntity entity = userProfileRepository.findById(req.userId())
                .orElseGet(() -> new UserProfileEntity(req.userId(), null, null, null, null));

        entity.setProvince(trimOrNull(req.province()));
        entity.setDistrict(trimOrNull(req.district()));
        entity.setSubDistrict(trimOrNull(req.subDistrict()));
        entity.setMainAgricultureType(trimOrNull(req.mainAgricultureType()));

        return toRes(userProfileRepository.save(entity));
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private UserProfileRes toRes(UserProfileEntity entity) {
        return new UserProfileRes(
                entity.getUserId(),
                entity.getProvince(),
                entity.getDistrict(),
                entity.getSubDistrict(),
                entity.getMainAgricultureType(),
                entity.getUpdatedAt());
    }
}
