package com.example.demo.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.res.EntrepreneurProductRes;
import com.example.demo.service.EntrepreneurProductService;

@RestController
@RequestMapping("/api/entrepreneur/products")
public class EntrepreneurProductController {

    private final EntrepreneurProductService productService;

    public EntrepreneurProductController(EntrepreneurProductService productService) {
        this.productService = productService;
    }

    /** รายการสินค้าของผู้ใช้ (เจ้าของ) */
    @GetMapping("")
    public ResponseEntity<ApiRes<List<EntrepreneurProductRes>>> listMine(@RequestParam UUID userId) {
        return ResponseEntity.ok(ApiRes.success(productService.listMine(userId), "OK"));
    }

    /** รายการสินค้าทั้งหมด — สำหรับหน้าแสดงผลสาธารณะในแอป */
    @GetMapping("/catalog")
    public ResponseEntity<ApiRes<List<EntrepreneurProductRes>>> listCatalog() {
        return ResponseEntity.ok(ApiRes.success(productService.listAll(), "OK"));
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ApiRes<EntrepreneurProductRes>> get(
            @PathVariable UUID productId,
            @RequestParam UUID userId) {
        return ResponseEntity.ok(ApiRes.success(productService.get(productId, userId), "OK"));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiRes<EntrepreneurProductRes>> create(
            @RequestParam UUID userId,
            @RequestParam UUID productTypeId,
            @RequestParam String name,
            @RequestParam String properties,
            @RequestParam String price,
            @RequestParam String address,
            @RequestParam String phone,
            @RequestParam(required = false) String tiktok,
            @RequestParam(required = false) String facebook,
            @RequestParam(required = false, name = "lineId") String lineId,
            @RequestPart("images") MultipartFile[] images) {
        EntrepreneurProductRes data = productService.create(
                userId,
                productTypeId,
                name,
                properties,
                price,
                address,
                phone,
                tiktok,
                facebook,
                lineId,
                images);
        return ResponseEntity.ok(ApiRes.success(data, "Insert Success"));
    }

    @PutMapping(path = "/{productId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiRes<EntrepreneurProductRes>> update(
            @PathVariable UUID productId,
            @RequestParam UUID userId,
            @RequestParam UUID productTypeId,
            @RequestParam String name,
            @RequestParam String properties,
            @RequestParam String price,
            @RequestParam String address,
            @RequestParam String phone,
            @RequestParam(required = false) String tiktok,
            @RequestParam(required = false) String facebook,
            @RequestParam(required = false, name = "lineId") String lineId,
            @RequestParam(required = false) String keepImagePaths,
            @RequestPart(value = "images", required = false) MultipartFile[] images) {
        EntrepreneurProductRes data = productService.update(
                productId,
                userId,
                productTypeId,
                name,
                properties,
                price,
                address,
                phone,
                tiktok,
                facebook,
                lineId,
                keepImagePaths,
                images);
        return ResponseEntity.ok(ApiRes.success(data, "Update Success"));
    }

    @DeleteMapping("")
    public ResponseEntity<ApiRes<Void>> delete(
            @RequestParam UUID productId,
            @RequestParam UUID userId) {
        productService.delete(productId, userId);
        return ResponseEntity.ok(ApiRes.success(null, "Delete Success"));
    }
}
