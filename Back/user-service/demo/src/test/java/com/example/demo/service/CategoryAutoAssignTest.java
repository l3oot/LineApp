package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.example.demo.entity.CategoryEntity;

class CategoryAutoAssignTest {

    @Test
    void sanitizeTrimsAndRejectsDigits() {
        assertEquals("ปุ๋ย", CategoryAutoAssign.sanitizeProposedName("  ปุ๋ย  "));
        assertEquals(null, CategoryAutoAssign.sanitizeProposedName("ปุ๋ย 500"));
        assertEquals(null, CategoryAutoAssign.sanitizeProposedName(""));
        assertEquals(null, CategoryAutoAssign.sanitizeProposedName(null));
    }

    @Test
    void findMatchPrefersExactSameType() {
        CategoryEntity fertilizer = category("ปุ๋ย", "expense");
        List<CategoryEntity> rows = List.of(fertilizer, category("ขายสินค้า", "income"));

        assertEquals(fertilizer, CategoryAutoAssign.findMatch(rows, "ปุ๋ย", "expense").orElseThrow());
        assertTrue(CategoryAutoAssign.findMatch(rows, "ปุ๋ย", "income").isEmpty());
    }

    @Test
    void findMatchUsesSingleFuzzyContainment() {
        CategoryEntity fertilizer = category("ปุ๋ย", "expense");
        List<CategoryEntity> rows = List.of(fertilizer, category("ค่าน้ำมัน", "expense"));

        assertEquals(fertilizer, CategoryAutoAssign.findMatch(rows, "ปุ๋ยเคมี", "expense").orElseThrow());
    }

    @Test
    void findMatchSkipsAmbiguousFuzzy() {
        List<CategoryEntity> rows = List.of(
                category("ปุ๋ยเคมี", "expense"),
                category("ปุ๋ยอินทรีย์", "expense"));

        assertTrue(CategoryAutoAssign.findMatch(rows, "ปุ๋ย", "expense").isEmpty());
    }

    private static CategoryEntity category(String name, String type) {
        CategoryEntity entity = new CategoryEntity(UUID.randomUUID(), name, type);
        entity.setCategoryId(UUID.randomUUID());
        return entity;
    }
}
