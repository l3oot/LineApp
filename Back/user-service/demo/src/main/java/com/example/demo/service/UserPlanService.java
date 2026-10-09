package com.example.demo.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.dto.res.UserPlanQuotaRes;
import com.example.demo.entity.PlanEntity;
import com.example.demo.entity.UserPlanEntity;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.CropRepository;
import com.example.demo.repository.PlanRepository;
import com.example.demo.repository.UserPlanRepository;

@Service
public class UserPlanService {

    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_EXPIRED = "expired";
    public static final String STATUS_CANCELLED = "cancelled";
    public static final String CROP_STATUS_ACTIVE = "active";
    public static final String FREE_PLAN_NAME = "free";

    private final UserPlanRepository userPlanRepository;
    private final PlanRepository planRepository;
    private final CropRepository cropRepository;
    private final CategoryRepository categoryRepository;

    public UserPlanService(
            UserPlanRepository userPlanRepository,
            PlanRepository planRepository,
            CropRepository cropRepository,
            CategoryRepository categoryRepository) {
        this.userPlanRepository = userPlanRepository;
        this.planRepository = planRepository;
        this.cropRepository = cropRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public UserPlanQuotaRes getQuota(UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }

        UserPlanEntity userPlan = userPlanRepository.findByUserIdAndStatus(userId, STATUS_ACTIVE).orElse(null);
        PlanEntity plan = resolvePlanForQuota(userPlan);
        long activeCount = cropRepository.countByUserIdAndStatus(userId, CROP_STATUS_ACTIVE);
        int maxCycles = plan.getMaxCycles();
        boolean canCreate = maxCycles == -1 || activeCount < maxCycles;
        LocalDateTime expiresAt = userPlan != null && !isExpired(userPlan) ? userPlan.getExpiresAt() : null;
        int maxCategories = resolveMaxCategories(plan);
        long categoryCount = categoryRepository.countByUserId(userId);
        boolean canCreateCategory = maxCategories == -1 || categoryCount < maxCategories;

        return new UserPlanQuotaRes(
                plan.getName(),
                maxCycles,
                activeCount,
                canCreate,
                expiresAt,
                maxCategories,
                categoryCount,
                canCreateCategory);
    }

    private PlanEntity resolvePlanForQuota(UserPlanEntity userPlan) {
        if (userPlan == null || isExpired(userPlan)) {
            return planRepository.findByNameAndIsActiveTrue(FREE_PLAN_NAME)
                    .orElseThrow(() -> new ApiException(ErrorCode.INTERNAL_ERROR, "Free plan is not configured"));
        }

        return planRepository.findById(userPlan.getPlanId())
                .orElseThrow(() -> new ApiException(ErrorCode.INTERNAL_ERROR, "Plan not found"));
    }

    @Transactional
    public void ensureActivePlan(UUID userId) {
        resolveActiveUserPlanForUpdate(userId);
    }

    @Transactional
    public void assignFreePlan(UUID userId) {
        if (userPlanRepository.existsByUserIdAndStatus(userId, STATUS_ACTIVE)) {
            return;
        }

        PlanEntity freePlan = planRepository.findByNameAndIsActiveTrue(FREE_PLAN_NAME)
                .orElseThrow(() -> new ApiException(ErrorCode.INTERNAL_ERROR, "Free plan is not configured"));

        userPlanRepository.save(new UserPlanEntity(userId, freePlan.getPlanId(), null, STATUS_ACTIVE));
    }

    @Transactional
    public void assertCanCreateCrop(UUID userId) {
        UserPlanEntity userPlan = resolveActiveUserPlanForUpdate(userId);
        PlanEntity plan = planRepository.findById(userPlan.getPlanId())
                .orElseThrow(() -> new ApiException(ErrorCode.INTERNAL_ERROR, "Plan not found"));

        if (plan.getMaxCycles() == -1) {
            return;
        }

        long activeCount = cropRepository.countByUserIdAndStatus(userId, CROP_STATUS_ACTIVE);
        if (activeCount >= plan.getMaxCycles()) {
            throw new ApiException(
                    ErrorCode.CROP_QUOTA_EXCEEDED,
                    "Active crop limit reached (" + plan.getMaxCycles() + ")");
        }
    }

    /** @deprecated use {@link #assertCanCreateCrop(UUID)} */
    @Transactional
    public void assertCanCreateCycle(UUID userId) {
        assertCanCreateCrop(userId);
    }

    @Transactional
    public void assertCanCreateCategory(UUID userId) {
        UserPlanEntity userPlan = resolveActiveUserPlanForUpdate(userId);
        PlanEntity plan = planRepository.findById(userPlan.getPlanId())
                .orElseThrow(() -> new ApiException(ErrorCode.INTERNAL_ERROR, "Plan not found"));

        int maxCategories = resolveMaxCategories(plan);
        if (maxCategories == -1) {
            return;
        }

        long categoryCount = categoryRepository.countByUserId(userId);
        if (categoryCount >= maxCategories) {
            throw new ApiException(
                    ErrorCode.CATEGORY_QUOTA_EXCEEDED,
                    "Category limit reached (" + maxCategories + ")");
        }
    }

    private int resolveMaxCategories(PlanEntity plan) {
        if (plan.getMaxCategories() != null) {
            return plan.getMaxCategories();
        }
        return switch (plan.getName()) {
            case "plus" -> 10;
            case "pro" -> -1;
            default -> 20;
        };
    }

    private UserPlanEntity resolveActiveUserPlanForUpdate(UUID userId) {
        UserPlanEntity userPlan = userPlanRepository.findByUserIdAndStatusForUpdate(userId, STATUS_ACTIVE)
                .orElse(null);

        if (userPlan == null) {
            assignFreePlan(userId);
            return userPlanRepository.findByUserIdAndStatusForUpdate(userId, STATUS_ACTIVE)
                    .orElseThrow(() -> new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to assign free plan"));
        }

        if (isExpired(userPlan)) {
            userPlan.setStatus(STATUS_EXPIRED);
            userPlanRepository.save(userPlan);
            assignFreePlan(userId);
            return userPlanRepository.findByUserIdAndStatusForUpdate(userId, STATUS_ACTIVE)
                    .orElseThrow(() -> new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to assign free plan"));
        }

        return userPlan;
    }

    private boolean isExpired(UserPlanEntity userPlan) {
        return userPlan.getExpiresAt() != null && userPlan.getExpiresAt().isBefore(LocalDateTime.now());
    }
}
