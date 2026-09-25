package com.example.demo.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.dto.req.CycleCreateReq;
import com.example.demo.dto.req.CycleUpdateReq;
import com.example.demo.dto.res.CycleRes;
import com.example.demo.entity.BudgetCycleEntity;
import com.example.demo.entity.CropEntity;
import com.example.demo.entity.CycleEntity;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.repository.BudgetCycleRepository;
import com.example.demo.repository.CropRepository;
import com.example.demo.repository.CycleRepository;
import com.example.demo.repository.TransactionRepository;

@Service
public class CycleService {

    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_COMPLETED = "completed";

    private final CycleRepository cycleRepository;
    private final CropRepository cropRepository;
    private final BudgetCycleRepository budgetCycleRepository;
    private final TransactionRepository transactionRepository;

    public CycleService(
            CycleRepository cycleRepository,
            CropRepository cropRepository,
            BudgetCycleRepository budgetCycleRepository,
            TransactionRepository transactionRepository) {
        this.cycleRepository = cycleRepository;
        this.cropRepository = cropRepository;
        this.budgetCycleRepository = budgetCycleRepository;
        this.transactionRepository = transactionRepository;
    }

    public List<CycleRes> getCyclesByUserId(UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        Map<UUID, CropEntity> crops = cropMap(cropRepository.findByUserIdOrderByCreatedAtDesc(userId));
        return cycleRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(entity -> toRes(entity, crops.get(entity.getCropId())))
                .toList();
    }

    public List<CycleRes> getCyclesByCropId(UUID cropId, UUID userId) {
        CropEntity crop = requireOwnedCrop(cropId, userId);
        return cycleRepository.findByCropIdOrderByCreatedAtDesc(cropId).stream()
                .map(entity -> toRes(entity, crop))
                .toList();
    }

    public CycleRes getCycle(UUID cycleId, UUID userId) {
        CycleEntity entity = requireOwnedCycle(cycleId, userId);
        CropEntity crop = cropRepository.findById(entity.getCropId()).orElse(null);
        return toRes(entity, crop);
    }

    public CycleRes updateCycle(CycleUpdateReq req) {
        if (req.cycleId() == null) {
            throw new ApiException(ErrorCode.CYCLE_ID_REQUIRED, "cycleId is required");
        }
        if (req.startDate() == null || req.endDate() == null || req.status() == null) {
            throw new ApiException(ErrorCode.CYCLE_UPDATE_FIELDS_REQUIRED, "All fields are required for update");
        }
        String note = normalizeNote(req.note());

        CycleEntity entity = cycleRepository.findById(req.cycleId())
                .orElseThrow(() -> new ApiException(ErrorCode.CYCLE_NOT_FOUND, "Cycle not found"));

        entity.setNote(note);
        entity.setStartDate(req.startDate());
        entity.setEndDate(req.endDate());
        entity.setStatus(req.status());

        CycleEntity saved = cycleRepository.save(entity);
        CropEntity crop = cropRepository.findById(saved.getCropId()).orElse(null);
        return toRes(saved, crop);
    }

    @Transactional
    public void deleteCycle(UUID cycleId, UUID userId) {
        CycleEntity entity = requireOwnedCycle(cycleId, userId);
        if (transactionRepository.existsByCycleId(cycleId)) {
            throw new ApiException(ErrorCode.CROP_HAS_TRANSACTIONS, "Cannot delete season with transactions");
        }
        budgetCycleRepository.deleteByCycleId(cycleId);
        cycleRepository.deleteById(entity.getCycleId());
    }

    @Transactional
    public CycleRes createCycle(CycleCreateReq req) {
        if (req.userId() == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        if (req.cropId() == null) {
            throw new ApiException(ErrorCode.CYCLE_CROP_ID_REQUIRED, "cropId is required");
        }
        if (req.startDate() == null || req.endDate() == null) {
            throw new ApiException(ErrorCode.CYCLE_UPDATE_FIELDS_REQUIRED, "startDate and endDate are required");
        }
        if (req.budgetAmount() != null && req.budgetAmount().signum() < 0) {
            throw new ApiException(ErrorCode.BUDGET_AMOUNT_INVALID, "budgetAmount must be >= 0");
        }

        CropEntity crop = requireOwnedCrop(req.cropId(), req.userId());
        String status = req.status() == null || req.status().isBlank() ? STATUS_ACTIVE : req.status();
        String note = normalizeNote(req.note());

        if (STATUS_ACTIVE.equals(status)) {
            completeOtherActiveSeasons(crop.getCropId());
        }

        CycleEntity saved = cycleRepository.save(new CycleEntity(
                crop.getCropId(),
                req.userId(),
                req.startDate(),
                req.endDate(),
                note,
                status));

        if (req.budgetAmount() != null && req.budgetAmount().signum() > 0) {
            budgetCycleRepository.save(new BudgetCycleEntity(saved.getCycleId(), req.budgetAmount()));
        }

        return toRes(saved, crop);
    }

    CycleRes toRes(CycleEntity entity, CropEntity crop) {
        BigDecimal budget = budgetCycleRepository.findFirstByCycleIdOrderByCreatedAtDesc(entity.getCycleId())
                .map(BudgetCycleEntity::getAmount)
                .orElse(null);
        Long dateComeIn = entity.getEndDate() == null
                ? null
                : ChronoUnit.DAYS.between(LocalDate.now(), entity.getEndDate()) + 1;
        return new CycleRes(
                entity.getCycleId(),
                entity.getCropId(),
                entity.getUserId(),
                crop != null ? crop.getName() : null,
                entity.getNote(),
                crop != null ? crop.getFarmType() : null,
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getStatus(),
                crop != null ? crop.getIcon() : null,
                entity.getCreatedAt(),
                budget,
                dateComeIn);
    }

    CycleRes pickCurrentSeason(UUID cropId, CropEntity crop) {
        List<CycleEntity> seasons = cycleRepository.findByCropIdOrderByCreatedAtDesc(cropId);
        if (seasons.isEmpty()) {
            return null;
        }
        CycleEntity current = seasons.stream()
                .filter(s -> STATUS_ACTIVE.equals(s.getStatus()))
                .findFirst()
                .orElseGet(() -> seasons.stream()
                        .max(Comparator
                                .comparing(CycleEntity::getEndDate, Comparator.nullsLast(Comparator.naturalOrder()))
                                .thenComparing(CycleEntity::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                        .orElse(seasons.get(0)));
        return toRes(current, crop);
    }

    private void completeOtherActiveSeasons(UUID cropId) {
        for (CycleEntity season : cycleRepository.findByCropIdAndStatus(cropId, STATUS_ACTIVE)) {
            season.setStatus(STATUS_COMPLETED);
            cycleRepository.save(season);
        }
    }

    private CycleEntity requireOwnedCycle(UUID cycleId, UUID userId) {
        if (cycleId == null || userId == null) {
            throw new ApiException(ErrorCode.CYCLE_ID_USER_ID_REQUIRED, "cycleId and userId are required");
        }
        CycleEntity entity = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ApiException(ErrorCode.CYCLE_NOT_FOUND, "Cycle not found"));
        if (!entity.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        return entity;
    }

    private CropEntity requireOwnedCrop(UUID cropId, UUID userId) {
        if (cropId == null || userId == null) {
            throw new ApiException(ErrorCode.CROP_ID_USER_ID_REQUIRED, "cropId and userId are required");
        }
        CropEntity crop = cropRepository.findById(cropId)
                .orElseThrow(() -> new ApiException(ErrorCode.CROP_NOT_FOUND, "Crop not found"));
        if (!crop.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        return crop;
    }

    private static Map<UUID, CropEntity> cropMap(List<CropEntity> crops) {
        Map<UUID, CropEntity> map = new HashMap<>();
        for (CropEntity crop : crops) {
            map.put(crop.getCropId(), crop);
        }
        return map;
    }

    private static String normalizeNote(String note) {
        String value = note == null ? "" : note.trim();
        if (value.length() > 50) {
            throw new ApiException(ErrorCode.CYCLE_NOTE_TOO_LONG, "Note cannot exceed 50 characters");
        }
        return value;
    }
}
