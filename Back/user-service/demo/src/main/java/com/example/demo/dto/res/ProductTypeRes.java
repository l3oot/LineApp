package com.example.demo.dto.res;

import java.util.UUID;

public record ProductTypeRes(
        UUID productTypeId,
        String name,
        int sortOrder) {
}
