package com.example.demo.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

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

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public CategoryService(CategoryRepository categoryRepository, UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
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
