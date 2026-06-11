package com.example.demo.exception;

import org.springframework.http.HttpStatus;

import com.example.demo.enums.ErrorCode;

public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.status = errorCode.getHttpStatus();
    }

    public HttpStatus getStatus() {
        return status;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
