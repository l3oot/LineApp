package com.example.demo.enums;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    VALIDATION_ERROR(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    INVALID_CREDENTIAL(TypeError.INVALID_CREDENTIAL, HttpStatus.UNAUTHORIZED),
    FORBIDDEN(TypeError.FORBIDDEN, HttpStatus.FORBIDDEN),
    NOT_FOUND(TypeError.NOT_FOUND, HttpStatus.NOT_FOUND),
    CONFLICT(TypeError.CONFLICT, HttpStatus.CONFLICT),
    INTERNAL_ERROR(TypeError.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR),

    HCODE_NOT_CONFIGURED(TypeError.INTERNAL_ERROR, HttpStatus.SERVICE_UNAVAILABLE),
    HCODE_API_ERROR(TypeError.INTERNAL_ERROR, HttpStatus.BAD_GATEWAY),

    USER_ID_REQUIRED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    TX_ID_USER_ID_REQUIRED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    TX_TYPE_REQUIRED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    TX_TYPE_INVALID(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    AMOUNT_INVALID(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    TX_DATE_REQUIRED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    CYCLE_NOT_OWNED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    TRANSACTION_NOT_FOUND(TypeError.NOT_FOUND, HttpStatus.NOT_FOUND),
    USER_NOT_FOUND(TypeError.NOT_FOUND, HttpStatus.NOT_FOUND),

    CYCLE_ID_USER_ID_REQUIRED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    CYCLE_ID_REQUIRED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    CYCLE_NOT_FOUND(TypeError.NOT_FOUND, HttpStatus.NOT_FOUND),
    CYCLE_UPDATE_FIELDS_REQUIRED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    CYCLE_NAME_EXISTS(TypeError.CONFLICT, HttpStatus.CONFLICT),
    BUDGET_AMOUNT_INVALID(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),

    CATEGORY_ID_USER_ID_REQUIRED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    CATEGORY_NOT_FOUND(TypeError.NOT_FOUND, HttpStatus.NOT_FOUND),
    CATEGORY_NAME_REQUIRED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    CATEGORY_TYPE_REQUIRED(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    CATEGORY_TYPE_INVALID(TypeError.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
    CATEGORY_NAME_EXISTS(TypeError.CONFLICT, HttpStatus.CONFLICT);

    private final TypeError typeError;
    private final HttpStatus httpStatus;

    ErrorCode(TypeError typeError, HttpStatus httpStatus) {
        this.typeError = typeError;
        this.httpStatus = httpStatus;
    }

    public TypeError getTypeError() {
        return typeError;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }
}
