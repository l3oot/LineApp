package com.example.demo.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.CategoryCreateReq;
import com.example.demo.dto.req.CategoryUpdateReq;
import com.example.demo.dto.res.CategoryRes;
import com.example.demo.service.CategoryService;
import com.example.demo.util.ApiResMapper;

@RestController
@RequestMapping("/api/category")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("")
    public ResponseEntity<ApiRes<List<CategoryRes>>> listCategories(
            @RequestParam UUID userId,
            @RequestParam(required = false) String type) {
        return ApiResMapper.toResponseEntity(categoryService.listCategories(userId, type));
    }

    /** GET /api/category/user/{userId} — รายการหมวดของผู้ใช้ (type กรองได้ผ่าน query) */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiRes<List<CategoryRes>>> listCategoriesByUser(
            @PathVariable UUID userId,
            @RequestParam(required = false) String type) {
        return ApiResMapper.toResponseEntity(categoryService.listCategories(userId, type));
    }

    @GetMapping("/{categoryId}")
    public ResponseEntity<ApiRes<CategoryRes>> getCategory(
            @PathVariable UUID categoryId,
            @RequestParam UUID userId) {
        return ApiResMapper.toResponseEntity(categoryService.getCategory(categoryId, userId));
    }

    @PostMapping("")
    public ResponseEntity<ApiRes<CategoryRes>> createCategory(@RequestBody CategoryCreateReq req) {
        return ApiResMapper.toResponseEntity(categoryService.createCategory(req));
    }

    @PutMapping("")
    public ResponseEntity<ApiRes<CategoryRes>> updateCategory(@RequestBody CategoryUpdateReq req) {
        return ApiResMapper.toResponseEntity(categoryService.updateCategory(req));
    }

    @DeleteMapping("")
    public ResponseEntity<ApiRes<Void>> deleteCategory(
            @RequestParam UUID categoryId,
            @RequestParam UUID userId) {
        return ApiResMapper.toResponseEntity(categoryService.deleteCategory(categoryId, userId));
    }
}
