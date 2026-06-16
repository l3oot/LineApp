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
import com.example.demo.repository.CycleRepository;
import com.example.demo.repository.PlanRepository;
import com.example.demo.repository.UserPlanRepository;

@Service
public class UserPlanService {

    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_EXPIRED = "expired";
    public static final String STATUS_CANCELLED = "cancelled";
    public static final String CYCLE_STATUS_ACTIVE = "active";
    public static final String FREE_PLAN_NAME = "free";

    private final UserPlanRepository userPlanRepository;
    private final PlanRepository planRepository;
    private final CycleRepository cycleRepository;

    public UserPlanService(
            UserPlanRepository userPlanRepository,
            PlanRepository planRepository,
            CycleRepository cycleRepository) {
        this.userPlanRepository = userPlanRepository;
        this.planRepository = planRepository;
        this.cycleRepository = cycleRepository;
    }

    @Transactional(readOnly = true)
    public UserPlanQuotaRes getQuota(UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }

        UserPlanEntity userPlan = userPlanRepository.findByUserIdAndStatus(userId, STATUS_ACTIVE).orElse(null);
        PlanEntity plan = resolvePlanForQuota(userPlan);
        long activeCount = cycleRepository.countByUserIdAndStatus(userId, CYCLE_STATUS_ACTIVE);
        int maxCycles = plan.getMaxCycles();
        boolean canCreate = maxCycles == -1 || activeCount < maxCycles;
        LocalDateTime expiresAt = userPlan != null && !isExpired(userPlan) ? userPlan.getExpiresAt() : null;

        return new UserPlanQuotaRes(plan.getName(), maxCycles, activeCount, canCreate, expiresAt);
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
    public void assertCanCreateCycle(UUID userId) {
        UserPlanEntity userPlan = resolveActiveUserPlanForUpdate(userId);
        PlanEntity plan = planRepository.findById(userPlan.getPlanId())
                .orElseThrow(() -> new ApiException(ErrorCode.INTERNAL_ERROR, "Plan not found"));

        if (plan.getMaxCycles() == -1) {
            return;
        }

        long activeCount = cycleRepository.countByUserIdAndStatus(userId, CYCLE_STATUS_ACTIVE);
        if (activeCount >= plan.getMaxCycles()) {
            throw new ApiException(
                    ErrorCode.CYCLE_QUOTA_EXCEEDED,
                    "Active cycle limit reached (" + plan.getMaxCycles() + ")");
        }
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
        LocalDateTime expiresAt = userPlan.getExpiresAt();
        return expiresAt != null && !expiresAt.isAfter(LocalDateTime.now());
    }
}
