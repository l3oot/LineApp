package com.example.demo.dto.res;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record EntrepreneurProductRes(
        UUID productId,
        UUID userId,
        UUID productTypeId,
        String productTypeName,
        String name,
        String properties,
        BigDecimal price,
        String address,
        String phone,
        String tiktok,
        String facebook,
        String lineId,
        List<String> imagePaths,
        List<String> imageUrls,
        /** First image URL — convenient for list/card thumbnails. */
        String imageUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
