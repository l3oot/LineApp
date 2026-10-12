package com.example.demo.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import com.example.demo.entity.CategoryEntity;

/**
 * Match or sanitize a category name proposed by AI before silent auto-create.
 */
final class CategoryAutoAssign {

    static final int MAX_NAME_LENGTH = 40;
    static final int MIN_FUZZY_LENGTH = 3;

    private CategoryAutoAssign() {
    }

    static String sanitizeProposedName(String raw) {
        if (raw == null) {
            return null;
        }
        String name = raw.trim().replaceAll("\\s+", " ");
        if (name.isEmpty()) {
            return null;
        }
        for (int i = 0; i < name.length(); i++) {
            if (Character.isDigit(name.charAt(i))) {
                return null;
            }
        }
        if (name.length() > MAX_NAME_LENGTH) {
            name = name.substring(0, MAX_NAME_LENGTH).trim();
        }
        return name.isEmpty() ? null : name;
    }

    static Optional<CategoryEntity> findMatch(List<CategoryEntity> existing, String proposedName, String type) {
        String name = sanitizeProposedName(proposedName);
        if (name == null || existing == null || existing.isEmpty()) {
            return Optional.empty();
        }
        String nameKey = name.toLowerCase(Locale.ROOT);
        String typeKey = type == null ? "" : type.trim().toLowerCase(Locale.ROOT);

        CategoryEntity exactType = null;
        CategoryEntity exactName = null;
        for (CategoryEntity row : existing) {
            if (row == null || row.getName() == null) {
                continue;
            }
            if (!row.getName().trim().equalsIgnoreCase(name)) {
                continue;
            }
            if (!typeKey.isEmpty() && typeKey.equalsIgnoreCase(blankToEmpty(row.getType()))) {
                exactType = row;
                break;
            }
            exactName = row;
        }
        if (exactType != null) {
            return Optional.of(exactType);
        }
        if (exactName != null) {
            return Optional.empty();
        }
        if (typeKey.isEmpty() || nameKey.length() < MIN_FUZZY_LENGTH) {
            return Optional.empty();
        }

        List<CategoryEntity> fuzzy = new ArrayList<>();
        for (CategoryEntity row : existing) {
            if (row == null || row.getName() == null) {
                continue;
            }
            if (!typeKey.equalsIgnoreCase(blankToEmpty(row.getType()))) {
                continue;
            }
            String rowKey = row.getName().trim().toLowerCase(Locale.ROOT);
            if (rowKey.length() < MIN_FUZZY_LENGTH) {
                continue;
            }
            if (rowKey.contains(nameKey) || nameKey.contains(rowKey)) {
                fuzzy.add(row);
            }
        }
        return fuzzy.size() == 1 ? Optional.of(fuzzy.get(0)) : Optional.empty();
    }

    private static String blankToEmpty(String raw) {
        return raw == null ? "" : raw.trim();
    }
}
