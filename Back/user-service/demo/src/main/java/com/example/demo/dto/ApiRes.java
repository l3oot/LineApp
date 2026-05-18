package com.example.demo.dto;

import com.example.demo.enums.TypeError;

public class ApiRes<T> {

    private boolean success;
    private String message;
    private T data;
    private TypeError typeError;

    public ApiRes() {
    }

    public ApiRes(boolean success, String message, T data, TypeError typeError) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.typeError = typeError;
    }

    public static <T> ApiRes<T> success(T data, String message) {
        return new ApiRes<>(true, message, data, TypeError.NONE);
    }

    public static <T> ApiRes<T> failure(String message, TypeError typeError) {
        return new ApiRes<>(false, message, null, typeError);
    }

    public TypeError getTypeError() {
        return typeError;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }
}
