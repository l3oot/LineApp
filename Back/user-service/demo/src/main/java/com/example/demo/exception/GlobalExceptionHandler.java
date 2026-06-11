package com.example.demo.exception;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.example.demo.dto.ApiRes;
import com.example.demo.enums.ErrorCode;
import com.example.demo.enums.TypeError;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiRes<Object>> handleApiException(ApiException ex) {
        ApiRes<Object> body = ApiRes.failure(ex.getErrorCode(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiRes<Map<String, String>>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fe -> fieldErrors.put(fe.getField(), fe.getDefaultMessage()));

        ApiRes<Map<String, String>> body = new ApiRes<>(
                false,
                "Validation failed",
                fieldErrors,
                TypeError.VALIDATION_ERROR,
                ErrorCode.VALIDATION_ERROR.name());
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiRes<Object>> handleAccessDenied(AccessDeniedException ex) {
        ApiRes<Object> body = ApiRes.failure(ErrorCode.FORBIDDEN, "Forbidden");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiRes<Object>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        ApiRes<Object> body = ApiRes.failure(ErrorCode.INTERNAL_ERROR, "Internal server error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
