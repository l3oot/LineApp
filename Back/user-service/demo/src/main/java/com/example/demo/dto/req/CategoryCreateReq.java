package com.example.demo.dto.req;

import java.util.UUID;

public record CategoryCreateReq(
        UUID userId,
        String name,
        String type) {
}
