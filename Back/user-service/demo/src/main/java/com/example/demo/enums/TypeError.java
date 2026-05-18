package com.example.demo.enums;

public enum TypeError {

    NONE("Success"),
    VALIDATION_ERROR("VALIDATION_ERROR"),
    INVALID_CREDENTIAL("INVALID_CREDENTIAL"),
    FORBIDDEN("FORBIDDEN"),
    NOT_FOUND("NOT_FOUND"),
    INTERNAL_ERROR("INTERNAL_ERROR"),
    CONFLICT("CONFLICT");

    private final String code;

    TypeError(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
