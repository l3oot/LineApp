package com.example.demo.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.CycleCreateReq;
import com.example.demo.dto.req.CycleUpdateReq;
import com.example.demo.dto.res.CycleCreateRes;
import com.example.demo.dto.res.CycleRes;
import com.example.demo.entity.CycleEntity;
import com.example.demo.enums.TypeError;
import com.example.demo.repository.CycleRepository;

@Service
public class CycleService {

    private final CycleRepository cycleRepository;

    public CycleService(CycleRepository cycleRepository) {
        this.cycleRepository = cycleRepository;
    }

    public ApiRes<List<CycleRes>> getCyclesByUserId(UUID userId) {
        if (userId == null) {
            return ApiRes.failure("userId is required", TypeError.VALIDATION_ERROR);
        }
        List<CycleRes> list = cycleRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toRes)
                .toList();
        return ApiRes.success(list, "OK");
    }

    public ApiRes<CycleRes> updateCycle(CycleUpdateReq req) {
        if (req.cycleId() == null) {
            return ApiRes.failure("cycleId is required", TypeError.VALIDATION_ERROR);
        }
        if (req.name() == null || req.farmType() == null || req.startDate() == null
                || req.endDate() == null || req.status() == null || req.icon() == null) {
            return ApiRes.failure("All fields are required for update", TypeError.VALIDATION_ERROR);
        }
        Optional<CycleEntity> opt = cycleRepository.findById(req.cycleId());
        if (opt.isEmpty()) {
            return ApiRes.failure("Cycle not found", TypeError.NOT_FOUND);
        }
        if (cycleRepository.existsByNameAndCycleIdNot(req.name(), req.cycleId())) {
            return ApiRes.failure("Name already exists", TypeError.CONFLICT);
        }

        CycleEntity entity = opt.get();
        entity.setName(req.name());
        entity.setFarmType(req.farmType());
        entity.setStartDate(req.startDate());
        entity.setEndDate(req.endDate());
        entity.setStatus(req.status());
        entity.setIcon(req.icon());

        CycleEntity saved = cycleRepository.save(entity);
        return ApiRes.success(toRes(saved), "Update Success");
    }

    public ApiRes<Void> deleteCycle(UUID cycleId) {
        if (cycleId == null) {
            return ApiRes.failure("cycleId is required", TypeError.VALIDATION_ERROR);
        }
        if (!cycleRepository.existsById(cycleId)) {
            return ApiRes.failure("Cycle not found", TypeError.NOT_FOUND);
        }
        cycleRepository.deleteById(cycleId);
        return ApiRes.success(null, "Delete Success");
    }

    private CycleRes toRes(CycleEntity e) {
        return new CycleRes(
                e.getCycleId(),
                e.getUserId(),
                e.getName(),
                e.getFarmType(),
                e.getStartDate(),
                e.getEndDate(),
                e.getStatus(),
                e.getIcon(),
                e.getCreatedAt());
    }

    public ApiRes<CycleCreateRes> createCycle(CycleCreateReq req) {
        if (cycleRepository.existsByName(req.name())) {
            return ApiRes.failure("Name already exists", TypeError.CONFLICT);
        }

        CycleEntity entity = new CycleEntity(
                req.userId(),
                req.startDate(),
                req.endDate(),
                req.icon(),
                req.name(),
                req.farmType(),
                req.status()
        );

        CycleEntity saved = cycleRepository.save(entity);

        CycleCreateRes res = new CycleCreateRes(
                saved.getName(),
                saved.getFarmType(),
                saved.getStartDate(),
                saved.getEndDate(),
                saved.getStatus(),
                saved.getIcon()
        );

        return ApiRes.success(res, "Insert Success");
    }
}
