package com.example.demo.dto.req;

import java.util.UUID;

public record CategoryUpdateReq(
        UUID categoryId,
        UUID userId,
        String name,
        String type) {
}
