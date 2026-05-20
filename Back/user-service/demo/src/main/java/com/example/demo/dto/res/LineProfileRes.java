package com.example.demo.dto.res;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LineProfileRes(
        String userId,
        String displayName,
        String pictureUrl,
        String statusMessage) {
}
