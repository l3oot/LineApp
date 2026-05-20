package com.example.demo.dto.res;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LineVerifyRes(
        String sub,
        String name,
        String picture,
        String email,
        String error,
        @JsonProperty("error_description") String errorDescription) {
}
