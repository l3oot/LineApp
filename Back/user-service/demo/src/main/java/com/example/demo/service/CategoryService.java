package com.example.demo.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.CategoryCreateReq;
import com.example.demo.dto.req.CategoryUpdateReq;
import com.example.demo.dto.res.CategoryRes;
import com.example.demo.entity.CategoryEntity;
import com.example.demo.enums.TypeError;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.UserRepository;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public CategoryService(CategoryRepository categoryRepository, UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    public ApiRes<List<CategoryRes>> listCategories(UUID userId, String type) {
        if (userId == null) {
            return ApiRes.failure("userId is required", TypeError.VALIDATION_ERROR);
        }
        List<CategoryEntity> rows;
        if (type == null || type.isBlank()) {
            rows = categoryRepository.findByUserIdOrderByNameAsc(userId);
        } else {
            Optional<String> normalized = normalizeType(type);
            if (normalized.isEmpty()) {
                return ApiRes.failure("type must be income or expense", TypeError.VALIDATION_ERROR);
            }
            rows = categoryRepository.findByUserIdAndTypeOrderByNameAsc(userId, normalized.get());
        }
        return ApiRes.success(rows.stream().map(this::toRes).toList(), "OK");
    }

    public ApiRes<CategoryRes> getCategory(UUID categoryId, UUID userId) {
        if (categoryId == null || userId == null) {
            return ApiRes.failure("categoryId and userId are required", TypeError.VALIDATION_ERROR);
        }
        Optional<CategoryEntity> opt = categoryRepository.findById(categoryId);
        if (opt.isEmpty()) {
            return ApiRes.failure("Category not found", TypeError.NOT_FOUND);
        }
        CategoryEntity e = opt.get();
        if (!e.getUserId().equals(userId)) {
            return ApiRes.failure("Forbidden", TypeError.FORBIDDEN);
        }
        return ApiRes.success(toRes(e), "OK");
    }

    public ApiRes<CategoryRes> createCategory(CategoryCreateReq req) {
        if (req.getUserId() == null) {
            return ApiRes.failure("userId is required", TypeError.VALIDATION_ERROR);
        }
        String name = normalizeName(req.getName());
        if (name == null) {
            return ApiRes.failure("name is required", TypeError.VALIDATION_ERROR);
        }
        Optional<String> normalizedType = normalizeType(req.getType());
        if (normalizedType.isEmpty()) {
            return ApiRes.failure("type is required (income or expense)", TypeError.VALIDATION_ERROR);
        }
        if (!userRepository.existsById(req.getUserId())) {
            return ApiRes.failure("User not found", TypeError.NOT_FOUND);
        }
        if (categoryRepository.existsByUserIdAndName(req.getUserId(), name)) {
            return ApiRes.failure("Category name already exists for this user", TypeError.CONFLICT);
        }
        CategoryEntity saved = categoryRepository.save(
                new CategoryEntity(req.getUserId(), name, normalizedType.get()));
        return ApiRes.success(toRes(saved), "Insert Success");
    }

    public ApiRes<CategoryRes> updateCategory(CategoryUpdateReq req) {
        if (req.getCategoryId() == null || req.getUserId() == null) {
            return ApiRes.failure("categoryId and userId are required", TypeError.VALIDATION_ERROR);
        }
        String name = normalizeName(req.getName());
        if (name == null) {
            return ApiRes.failure("name is required", TypeError.VALIDATION_ERROR);
        }
        Optional<String> normalizedType = normalizeType(req.getType());
        if (normalizedType.isEmpty()) {
            return ApiRes.failure("type is required (income or expense)", TypeError.VALIDATION_ERROR);
        }
        Optional<CategoryEntity> opt = categoryRepository.findById(req.getCategoryId());
        if (opt.isEmpty()) {
            return ApiRes.failure("Category not found", TypeError.NOT_FOUND);
        }
        CategoryEntity entity = opt.get();
        if (!entity.getUserId().equals(req.getUserId())) {
            return ApiRes.failure("Forbidden", TypeError.FORBIDDEN);
        }
        if (categoryRepository.existsByUserIdAndNameAndCategoryIdNot(req.getUserId(), name, req.getCategoryId())) {
            return ApiRes.failure("Category name already exists for this user", TypeError.CONFLICT);
        }
        entity.setName(name);
        entity.setType(normalizedType.get());
        CategoryEntity saved = categoryRepository.save(entity);
        return ApiRes.success(toRes(saved), "Update Success");
    }

    public ApiRes<Void> deleteCategory(UUID categoryId, UUID userId) {
        if (categoryId == null || userId == null) {
            return ApiRes.failure("categoryId and userId are required", TypeError.VALIDATION_ERROR);
        }
        Optional<CategoryEntity> opt = categoryRepository.findById(categoryId);
        if (opt.isEmpty()) {
            return ApiRes.failure("Category not found", TypeError.NOT_FOUND);
        }
        if (!opt.get().getUserId().equals(userId)) {
            return ApiRes.failure("Forbidden", TypeError.FORBIDDEN);
        }
        categoryRepository.deleteById(categoryId);
        return ApiRes.success(null, "Delete Success");
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
