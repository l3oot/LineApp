package com.example.demo.service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.dto.req.CropCreateReq;
import com.example.demo.dto.req.CropUpdateReq;
import com.example.demo.dto.req.CycleCreateReq;
import com.example.demo.dto.res.CropRes;
import com.example.demo.dto.res.CycleRes;
import com.example.demo.entity.CropEntity;
import com.example.demo.entity.CycleEntity;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.repository.BudgetCycleRepository;
import com.example.demo.repository.CropRepository;
import com.example.demo.repository.CycleRepository;
import com.example.demo.repository.TransactionRepository;

@Service
public class CropService {

    public static final String STATUS_ACTIVE = "active";

    private final CropRepository cropRepository;
    private final CycleRepository cycleRepository;
    private final CycleService cycleService;
    private final BudgetCycleRepository budgetCycleRepository;
    private final TransactionRepository transactionRepository;
    private final UserPlanService userPlanService;

    public CropService(
            CropRepository cropRepository,
            CycleRepository cycleRepository,
            CycleService cycleService,
            BudgetCycleRepository budgetCycleRepository,
            TransactionRepository transactionRepository,
            UserPlanService userPlanService) {
        this.cropRepository = cropRepository;
        this.cycleRepository = cycleRepository;
        this.cycleService = cycleService;
        this.budgetCycleRepository = budgetCycleRepository;
        this.transactionRepository = transactionRepository;
        this.userPlanService = userPlanService;
    }

    public List<CropRes> getCropsByUserId(UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        return cropRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toRes)
                .toList();
    }

    public CropRes getCrop(UUID cropId, UUID userId) {
        return toRes(requireOwnedCrop(cropId, userId));
    }

    @Transactional
    public CropRes createCrop(CropCreateReq req) {
        if (req.userId() == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        String name = requireName(req.name());
        String note = normalizeNote(req.note(), ErrorCode.CROP_NOTE_TOO_LONG);
        String farmType = blankToNull(req.farmType());
        String icon = blankToNull(req.icon());
        String status = req.status() == null || req.status().isBlank() ? STATUS_ACTIVE : req.status();

        Integer startMonth = resolveMonth(req.startMonth(), req.startDate(), true);
        Integer endMonth = resolveMonth(req.endMonth(), req.endDate(), false);
        requireMonthPair(startMonth, endMonth);

        if (cropRepository.existsByUserIdAndNameIgnoreCase(req.userId(), name)) {
            throw new ApiException(ErrorCode.CROP_NAME_EXISTS, "Crop name already exists");
        }

        userPlanService.assertCanCreateCrop(req.userId());

        CropEntity saved = cropRepository.save(new CropEntity(
                req.userId(),
                name,
                farmType,
                icon,
                note,
                status,
                startMonth,
                endMonth));

        LocalDate startDate = req.startDate();
        LocalDate endDate = req.endDate();
        if (startDate == null && endDate == null && startMonth != null && endMonth != null) {
            LocalDate[] window = seasonWindowForCurrentYear(startMonth, endMonth);
            startDate = window[0];
            endDate = window[1];
        }

        if (startDate != null && endDate != null) {
            cycleService.createCycle(new CycleCreateReq(
                    req.userId(),
                    saved.getCropId(),
                    req.seasonNote(),
                    startDate,
                    endDate,
                    CycleService.STATUS_ACTIVE,
                    req.budgetAmount()));
        }

        return toRes(saved);
    }

    public CropRes updateCrop(CropUpdateReq req) {
        if (req.cropId() == null) {
            throw new ApiException(ErrorCode.CROP_ID_REQUIRED, "cropId is required");
        }
        if (req.name() == null || req.farmType() == null || req.status() == null || req.icon() == null) {
            throw new ApiException(ErrorCode.CROP_UPDATE_FIELDS_REQUIRED, "All fields are required for update");
        }

        CropEntity entity = cropRepository.findById(req.cropId())
                .orElseThrow(() -> new ApiException(ErrorCode.CROP_NOT_FOUND, "Crop not found"));

        String name = requireName(req.name());
        String note = normalizeNote(req.note(), ErrorCode.CROP_NOTE_TOO_LONG);
        Integer startMonth = req.startMonth() != null ? req.startMonth() : entity.getStartMonth();
        Integer endMonth = req.endMonth() != null ? req.endMonth() : entity.getEndMonth();
        requireMonthPair(startMonth, endMonth);

        if (cropRepository.existsByUserIdAndNameIgnoreCaseAndCropIdNot(entity.getUserId(), name, entity.getCropId())) {
            throw new ApiException(ErrorCode.CROP_NAME_EXISTS, "Crop name already exists");
        }

        entity.setName(name);
        entity.setNote(note);
        entity.setFarmType(req.farmType());
        entity.setIcon(req.icon());
        entity.setStatus(req.status());
        entity.setStartMonth(startMonth);
        entity.setEndMonth(endMonth);

        return toRes(cropRepository.save(entity));
    }

    @Transactional
    public void deleteCrop(UUID cropId, UUID userId) {
        CropEntity crop = requireOwnedCrop(cropId, userId);
        List<CycleEntity> seasons = cycleRepository.findByCropIdOrderByCreatedAtDesc(cropId);
        List<UUID> cycleIds = seasons.stream().map(CycleEntity::getCycleId).collect(Collectors.toList());
        if (!cycleIds.isEmpty() && transactionRepository.existsByCycleIdIn(cycleIds)) {
            throw new ApiException(ErrorCode.CROP_HAS_TRANSACTIONS, "Cannot delete crop with transactions");
        }
        for (CycleEntity season : seasons) {
            budgetCycleRepository.deleteByCycleId(season.getCycleId());
            cycleRepository.deleteById(season.getCycleId());
        }
        cropRepository.deleteById(crop.getCropId());
    }

    private CropRes toRes(CropEntity crop) {
        CycleRes currentSeason = cycleService.pickCurrentSeason(crop.getCropId(), crop);
        return new CropRes(
                crop.getCropId(),
                crop.getUserId(),
                crop.getName(),
                crop.getNote(),
                crop.getFarmType(),
                crop.getIcon(),
                crop.getStatus(),
                crop.getStartMonth(),
                crop.getEndMonth(),
                crop.getCreatedAt(),
                currentSeason);
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

    private static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new ApiException(ErrorCode.CROP_NAME_REQUIRED, "name is required");
        }
        return name.trim();
    }

    private static String normalizeNote(String note, ErrorCode tooLongCode) {
        String value = note == null ? "" : note.trim();
        if (value.length() > 50) {
            throw new ApiException(tooLongCode, "Note cannot exceed 50 characters");
        }
        return value;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static Integer resolveMonth(Integer month, LocalDate date, boolean start) {
        if (month != null) {
            return requireValidMonth(month);
        }
        if (date != null) {
            return date.getMonthValue();
        }
        return null;
    }

    private static Integer requireValidMonth(Integer month) {
        if (month == null || month < 1 || month > 12) {
            throw new ApiException(ErrorCode.CROP_MONTH_INVALID, "month must be 1-12");
        }
        return month;
    }

    private static void requireMonthPair(Integer startMonth, Integer endMonth) {
        if (startMonth == null && endMonth == null) {
            return;
        }
        if (startMonth == null || endMonth == null) {
            throw new ApiException(ErrorCode.CROP_MONTH_INVALID, "startMonth and endMonth are required together");
        }
        requireValidMonth(startMonth);
        requireValidMonth(endMonth);
    }

    /** สร้างช่วงวันที่ของปีปัจจุบันจากเดือนฐาน (รองรับข้ามปี เช่น พ.ย.-ก.พ.) */
    static LocalDate[] seasonWindowForCurrentYear(int startMonth, int endMonth) {
        int year = LocalDate.now().getYear();
        LocalDate start = LocalDate.of(year, startMonth, 1);
        LocalDate end;
        if (endMonth >= startMonth) {
            end = LocalDate.of(year, endMonth, 1).withDayOfMonth(LocalDate.of(year, endMonth, 1).lengthOfMonth());
        } else {
            end = LocalDate.of(year + 1, endMonth, 1)
                    .withDayOfMonth(LocalDate.of(year + 1, endMonth, 1).lengthOfMonth());
        }
        return new LocalDate[] { start, end };
    }
}
