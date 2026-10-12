package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.demo.dto.res.CategoryRes;
import com.example.demo.entity.CategoryEntity;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class CategoryServiceAutoCreateTest {

    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserPlanService userPlanService;

    private CategoryService categoryService;

    @BeforeEach
    void setUp() {
        categoryService = new CategoryService(categoryRepository, userRepository, userPlanService);
    }

    @Test
    void createsProposedCategoryWhenQuotaAllows() {
        UUID userId = UUID.randomUUID();
        when(categoryRepository.findByUserIdOrderByNameAsc(userId)).thenReturn(List.of());
        when(categoryRepository.findFirstByUserIdAndNameIgnoreCase(userId, "ปุ๋ย")).thenReturn(Optional.empty());
        when(userPlanService.tryCanCreateCategory(userId)).thenReturn(true);
        when(categoryRepository.save(any(CategoryEntity.class))).thenAnswer(invocation -> {
            CategoryEntity entity = invocation.getArgument(0);
            entity.setCategoryId(UUID.randomUUID());
            return entity;
        });

        Optional<CategoryRes> assigned = categoryService.assignForIncomingTransaction(
                userId, null, "expense", "ปุ๋ย");

        assertTrue(assigned.isPresent());
        assertEquals("ปุ๋ย", assigned.get().name());
        assertEquals("expense", assigned.get().type());
        verify(categoryRepository).save(any(CategoryEntity.class));
    }

    @Test
    void skipsCreateSilentlyWhenQuotaFull() {
        UUID userId = UUID.randomUUID();
        when(categoryRepository.findByUserIdOrderByNameAsc(userId)).thenReturn(List.of());
        when(categoryRepository.findFirstByUserIdAndNameIgnoreCase(userId, "ปุ๋ย")).thenReturn(Optional.empty());
        when(userPlanService.tryCanCreateCategory(userId)).thenReturn(false);

        Optional<CategoryRes> assigned = categoryService.assignForIncomingTransaction(
                userId, null, "expense", "ปุ๋ย");

        assertTrue(assigned.isEmpty());
        verify(categoryRepository, never()).save(any());
    }

    @Test
    void reusesExistingCategoryInsteadOfCreating() {
        UUID userId = UUID.randomUUID();
        CategoryEntity existing = new CategoryEntity(userId, "ปุ๋ย", "expense");
        existing.setCategoryId(UUID.randomUUID());
        when(categoryRepository.findByUserIdOrderByNameAsc(userId)).thenReturn(List.of(existing));

        Optional<CategoryRes> assigned = categoryService.assignForIncomingTransaction(
                userId, null, "expense", "ปุ๋ยเคมี");

        assertTrue(assigned.isPresent());
        assertEquals(existing.getCategoryId(), assigned.get().categoryId());
        verify(userPlanService, never()).tryCanCreateCategory(any());
        verify(categoryRepository, never()).save(any());
    }
}
