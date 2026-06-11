package com.example.demo.dto;

import com.example.demo.enums.ErrorCode;
import com.example.demo.enums.TypeError;

public record ApiRes<T>(
        boolean success,
        String message,
        T data,
        TypeError typeError,
        String code) {

    public static <T> ApiRes<T> success(T data, String message) {
        return new ApiRes<>(true, message, data, TypeError.NONE, null);
    }

    public static <T> ApiRes<T> failure(ErrorCode errorCode, String message) {
        return new ApiRes<>(false, message, null, errorCode.getTypeError(), errorCode.name());
    }
}
