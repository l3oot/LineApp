package com.example.demo.util;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.example.demo.dto.ApiRes;
import com.example.demo.enums.TypeError;

public class ApiResMapper {

    public static <T> ResponseEntity<ApiRes<T>> toResponseEntity(ApiRes<T> res) {
        if (res.isSuccess()) {
            return ResponseEntity.ok(res);
        }
        HttpStatus status = mapTypeErrorToStatus(res.getTypeError());
        return ResponseEntity.status(status).body(res);
    }

    private static HttpStatus mapTypeErrorToStatus(TypeError type) {
        if (type == null) return HttpStatus.INTERNAL_SERVER_ERROR;
        return switch (type) {
            case CONFLICT           -> HttpStatus.CONFLICT;
            case NOT_FOUND          -> HttpStatus.NOT_FOUND;
            case FORBIDDEN          -> HttpStatus.FORBIDDEN;
            case INVALID_CREDENTIAL -> HttpStatus.UNAUTHORIZED;
            case VALIDATION_ERROR   -> HttpStatus.BAD_REQUEST;
            case INTERNAL_ERROR     -> HttpStatus.INTERNAL_SERVER_ERROR;
            default                 -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }
}