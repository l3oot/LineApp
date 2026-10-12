package com.example.demo.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.dto.req.CategoryCreateReq;
import com.example.demo.dto.req.CategoryUpdateReq;
import com.example.demo.dto.res.CategoryRes;
import com.example.demo.entity.CategoryEntity;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.UserRepository;

@Service
public class CategoryService {

    private static final Logger log = LoggerFactory.getLogger(CategoryService.class);

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final UserPlanService userPlanService;

    public CategoryService(
            CategoryRepository categoryRepository,
            UserRepository userRepository,
            UserPlanService userPlanService) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.userPlanService = userPlanService;
    }

    public List<CategoryRes> listCategories(UUID userId, String type) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        List<CategoryEntity> rows;
        if (type == null || type.isBlank()) {
            rows = categoryRepository.findByUserIdOrderByNameAsc(userId);
        } else {
            String normalized = normalizeType(type)
                    .orElseThrow(() -> new ApiException(ErrorCode.CATEGORY_TYPE_INVALID, "type must be income or expense"));
            rows = categoryRepository.findByUserIdAndTypeOrderByNameAsc(userId, normalized);
        }
        return rows.stream().map(this::toRes).toList();
    }

    public CategoryRes getCategory(UUID categoryId, UUID userId) {
        if (categoryId == null || userId == null) {
            throw new ApiException(ErrorCode.CATEGORY_ID_USER_ID_REQUIRED, "categoryId and userId are required");
        }
        CategoryEntity entity = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ApiException(ErrorCode.CATEGORY_NOT_FOUND, "Category not found"));
        if (!entity.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        return toRes(entity);
    }

    @Transactional
    public CategoryRes createCategory(CategoryCreateReq req) {
        if (req.userId() == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        String name = normalizeName(req.name());
        if (name == null) {
            throw new ApiException(ErrorCode.CATEGORY_NAME_REQUIRED, "name is required");
        }
        String normalizedType = normalizeType(req.type())
                .orElseThrow(() -> new ApiException(ErrorCode.CATEGORY_TYPE_REQUIRED, "type is required (income or expense)"));
        if (!userRepository.existsById(req.userId())) {
            throw new ApiException(ErrorCode.USER_NOT_FOUND, "User not found");
        }
        if (categoryRepository.existsByUserIdAndName(req.userId(), name)) {
            throw new ApiException(ErrorCode.CATEGORY_NAME_EXISTS, "Category name already exists for this user");
        }
        userPlanService.assertCanCreateCategory(req.userId());
        CategoryEntity saved = categoryRepository.save(
                new CategoryEntity(req.userId(), name, normalizedType));
        return toRes(saved);
    }

    public CategoryRes updateCategory(CategoryUpdateReq req) {
        if (req.categoryId() == null || req.userId() == null) {
            throw new ApiException(ErrorCode.CATEGORY_ID_USER_ID_REQUIRED, "categoryId and userId are required");
        }
        String name = normalizeName(req.name());
        if (name == null) {
            throw new ApiException(ErrorCode.CATEGORY_NAME_REQUIRED, "name is required");
        }
        String normalizedType = normalizeType(req.type())
                .orElseThrow(() -> new ApiException(ErrorCode.CATEGORY_TYPE_REQUIRED, "type is required (income or expense)"));
        CategoryEntity entity = categoryRepository.findById(req.categoryId())
                .orElseThrow(() -> new ApiException(ErrorCode.CATEGORY_NOT_FOUND, "Category not found"));
        if (!entity.getUserId().equals(req.userId())) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        if (categoryRepository.existsByUserIdAndNameAndCategoryIdNot(req.userId(), name, req.categoryId())) {
            throw new ApiException(ErrorCode.CATEGORY_NAME_EXISTS, "Category name already exists for this user");
        }
        entity.setName(name);
        entity.setType(normalizedType);
        return toRes(categoryRepository.save(entity));
    }

    public void deleteCategory(UUID categoryId, UUID userId) {
        if (categoryId == null || userId == null) {
            throw new ApiException(ErrorCode.CATEGORY_ID_USER_ID_REQUIRED, "categoryId and userId are required");
        }
        CategoryEntity entity = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ApiException(ErrorCode.CATEGORY_NOT_FOUND, "Category not found"));
        if (!entity.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        categoryRepository.deleteById(categoryId);
    }

    /**
     * Match an incoming AI transaction to an existing category, or create one
     * quietly when the name is new and the plan still has room. Quota / name
     * collisions never surface to the user.
     */
    @Transactional
    public Optional<CategoryRes> assignForIncomingTransaction(
            UUID userId,
            UUID categoryId,
            String txType,
            String proposedName) {
        if (userId == null) {
            return Optional.empty();
        }
        try {
            Optional<String> normalizedType = normalizeType(txType);
            if (categoryId != null) {
                Optional<CategoryEntity> owned = categoryRepository.findById(categoryId)
                        .filter(row -> userId.equals(row.getUserId()));
                if (owned.isPresent()) {
                    return owned.map(this::toRes);
                }
            }
            if (normalizedType.isEmpty()) {
                return Optional.empty();
            }
            String type = normalizedType.get();
            List<CategoryEntity> existing = categoryRepository.findByUserIdOrderByNameAsc(userId);
            Optional<CategoryEntity> matched = CategoryAutoAssign.findMatch(existing, proposedName, type);
            if (matched.isPresent()) {
                return matched.map(this::toRes);
            }

            String name = CategoryAutoAssign.sanitizeProposedName(proposedName);
            if (name == null) {
                return Optional.empty();
            }
            Optional<CategoryEntity> byName = categoryRepository.findFirstByUserIdAndNameIgnoreCase(userId, name);
            if (byName.isPresent()) {
                CategoryEntity row = byName.get();
                if (type.equalsIgnoreCase(row.getType())) {
                    return Optional.of(toRes(row));
                }
                return Optional.empty();
            }
            if (!userPlanService.tryCanCreateCategory(userId)) {
                log.debug("skip auto-create category; quota full userId={}", userId);
                return Optional.empty();
            }
            byName = categoryRepository.findFirstByUserIdAndNameIgnoreCase(userId, name);
            if (byName.isPresent()) {
                CategoryEntity row = byName.get();
                if (type.equalsIgnoreCase(row.getType())) {
                    return Optional.of(toRes(row));
                }
                return Optional.empty();
            }
            CategoryEntity saved = categoryRepository.save(new CategoryEntity(userId, name, type));
            log.info("auto-created category userId={} name={} type={}", userId, name, type);
            return Optional.of(toRes(saved));
        } catch (RuntimeException e) {
            log.debug("skip auto-create category userId={}: {}", userId, e.getMessage());
            return Optional.empty();
        }
    }

    private static String normalizeName(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        return t.isEmpty() ? null : t;
    }

    private static Optional<String> normalizeType(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if ("income".equals(t) || "expense".equals(t)) {
            return Optional.of(t);
        }
        return Optional.empty();
    }

    private CategoryRes toRes(CategoryEntity e) {
        return new CategoryRes(e.getCategoryId(), e.getUserId(), e.getName(), e.getType(), e.getCreatedAt());
    }
}
