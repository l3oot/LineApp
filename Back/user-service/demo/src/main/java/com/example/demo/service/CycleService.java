package com.example.demo.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.dto.req.CycleCreateReq;
import com.example.demo.dto.req.CycleUpdateReq;
import com.example.demo.dto.res.CycleRes;
import com.example.demo.entity.BudgetCycleEntity;
import com.example.demo.entity.CycleEntity;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.repository.BudgetCycleRepository;
import com.example.demo.repository.CycleRepository;

@Service
public class CycleService {

    private final CycleRepository cycleRepository;
    private final BudgetCycleRepository budgetCycleRepository;
    private final UserPlanService userPlanService;

    public CycleService(
            CycleRepository cycleRepository,
            BudgetCycleRepository budgetCycleRepository,
            UserPlanService userPlanService) {
        this.cycleRepository = cycleRepository;
        this.budgetCycleRepository = budgetCycleRepository;
        this.userPlanService = userPlanService;
    }

    public List<CycleRes> getCyclesByUserId(UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        return cycleRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toRes)
                .toList();
    }

    public CycleRes getCycle(UUID cycleId, UUID userId) {
        if (cycleId == null || userId == null) {
            throw new ApiException(ErrorCode.CYCLE_ID_USER_ID_REQUIRED, "cycleId and userId are required");
        }
        CycleEntity entity = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(ErrorCode.CYCLE_NOT_FOUND, "Cycle not found"));
        if (!entity.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        return toRes(entity);
    }

    public CycleRes updateCycle(CycleUpdateReq req) {
        if (req.cycleId() == null) {
            throw new ApiException(ErrorCode.CYCLE_ID_REQUIRED, "cycleId is required");
        }
        if (req.name() == null || req.farmType() == null || req.startDate() == null
                || req.endDate() == null || req.status() == null || req.icon() == null) {
            throw new ApiException(ErrorCode.CYCLE_UPDATE_FIELDS_REQUIRED, "All fields are required for update");
        }
        CycleEntity entity = cycleRepository.findById(req.cycleId())
                .orElseThrow(() -> new ApiException(ErrorCode.CYCLE_NOT_FOUND, "Cycle not found"));
        if (cycleRepository.existsByNameAndCycleIdNot(req.name(), req.cycleId())) {
            throw new ApiException(ErrorCode.CYCLE_NAME_EXISTS, "Name already exists");
        }

        entity.setName(req.name());
        entity.setFarmType(req.farmType());
        entity.setStartDate(req.startDate());
        entity.setEndDate(req.endDate());
        entity.setStatus(req.status());
        entity.setIcon(req.icon());

        return toRes(cycleRepository.save(entity));
    }

    public void deleteCycle(UUID cycleId, UUID userId) {
        if (cycleId == null || userId == null) {
            throw new ApiException(ErrorCode.CYCLE_ID_USER_ID_REQUIRED, "cycleId and userId are required");
        }
        CycleEntity entity = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(ErrorCode.CYCLE_NOT_FOUND, "Cycle not found"));
        if (!entity.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        cycleRepository.deleteById(cycleId);
    }

    @Transactional
    public CycleRes createCycle(CycleCreateReq req) {
        if (req.userId() == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        if (req.budgetAmount() != null && req.budgetAmount().signum() < 0) {
            throw new ApiException(ErrorCode.BUDGET_AMOUNT_INVALID, "budgetAmount must be >= 0");
        }
        if (cycleRepository.existsByName(req.name())) {
            throw new ApiException(ErrorCode.CYCLE_NAME_EXISTS, "Name already exists");
        }

        userPlanService.assertCanCreateCycle(req.userId());

        CycleEntity entity = new CycleEntity(
                req.userId(),
                req.startDate(),
                req.endDate(),
                req.icon(),
                req.name(),
                req.farmType(),
                req.status());

        CycleEntity saved = cycleRepository.save(entity);

        if (req.budgetAmount() != null && req.budgetAmount().signum() > 0) {
            budgetCycleRepository.save(new BudgetCycleEntity(saved.getCycleId(), req.budgetAmount()));
        }

        return toRes(saved);
    }

    private CycleRes toRes(CycleEntity e) {
        BigDecimal budget = budgetCycleRepository.findFirstByCycleIdOrderByCreatedAtDesc(e.getCycleId())
                .map(BudgetCycleEntity::getAmount)
                .orElse(null);
        return new CycleRes(
                e.getCycleId(),
                e.getUserId(),
                e.getName(),
                e.getFarmType(),
                e.getStartDate(),
                e.getEndDate(),
                e.getStatus(),
                e.getIcon(),
                e.getCreatedAt(),
                budget);
    }
}
