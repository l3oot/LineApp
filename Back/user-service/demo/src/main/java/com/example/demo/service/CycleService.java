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
        if (req.getCycleId() == null) {
            return ApiRes.failure("cycleId is required", TypeError.VALIDATION_ERROR);
        }
        if (req.getName() == null || req.getFarmType() == null || req.getStartDate() == null
                || req.getEndDate() == null || req.getStatus() == null || req.getIcon() == null) {
            return ApiRes.failure("All fields are required for update", TypeError.VALIDATION_ERROR);
        }
        Optional<CycleEntity> opt = cycleRepository.findById(req.getCycleId());
        if (opt.isEmpty()) {
            return ApiRes.failure("Cycle not found", TypeError.NOT_FOUND);
        }
        if (cycleRepository.existsByNameAndCycleIdNot(req.getName(), req.getCycleId())) {
            return ApiRes.failure("Name already exists", TypeError.CONFLICT);
        }

        CycleEntity entity = opt.get();
        entity.setName(req.getName());
        entity.setFarmType(req.getFarmType());
        entity.setStartDate(req.getStartDate());
        entity.setEndDate(req.getEndDate());
        entity.setStatus(req.getStatus());
        entity.setIcon(req.getIcon());

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
        if (cycleRepository.existsByName(req.getName())) {
            return ApiRes.failure("Name already exists", TypeError.CONFLICT);
        }

        CycleEntity entity = new CycleEntity(
                req.getUserId(),
                req.getStartDate(),
                req.getEndDate(),
                req.getIcon(),
                req.getName(),
                req.getFarmType(),
                req.getStatus()
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
