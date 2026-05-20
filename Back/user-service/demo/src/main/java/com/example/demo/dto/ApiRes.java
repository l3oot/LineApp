package com.example.demo.dto;

import com.example.demo.enums.TypeError;

public record ApiRes<T>(
        boolean success,
        String message,
        T data,
        TypeError typeError) {

    public static <T> ApiRes<T> success(T data, String message) {
        return new ApiRes<>(true, message, data, TypeError.NONE);
    }

    public static <T> ApiRes<T> failure(String message, TypeError typeError) {
        return new ApiRes<>(false, message, null, typeError);
    }
}
