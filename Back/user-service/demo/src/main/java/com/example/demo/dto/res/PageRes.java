package com.example.demo.dto.res;

import java.util.List;

public record PageRes<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext) {
}
