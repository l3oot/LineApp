package com.example.demo.service;

import java.time.LocalDateTime;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.example.demo.config.LineProperties;
import com.example.demo.dto.res.AuthRes;
import com.example.demo.dto.res.LineProfileRes;
import com.example.demo.dto.res.LineTokenRes;
import com.example.demo.dto.res.LineVerifyRes;
import com.example.demo.entity.UserEntity;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.JwtUtil;

@Service
public class LineAuthService {

    private final LineProperties lineProperties;
    private final RestTemplate restTemplate;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public LineAuthService(LineProperties lineProperties, RestTemplate restTemplate, JwtUtil jwtUtil, UserRepository userRepository) {
        this.lineProperties = lineProperties;
        this.restTemplate = restTemplate;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    public LineTokenRes exchangeToken(String code) {
        String url = "https://api.line.me/oauth2/v2.1/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("code", code);
        body.add("redirect_uri", lineProperties.getRedirectUri());
        body.add("client_id", lineProperties.getClientId());
        body.add("client_secret", lineProperties.getClientSecret());

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<LineTokenRes> response = restTemplate.exchange(
                url, HttpMethod.POST, request, LineTokenRes.class);

        LineTokenRes tokenResponse = response.getBody();

        if (tokenResponse == null || tokenResponse.error() != null) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIAL,
                    "LINE token exchange failed: "
                            + (tokenResponse != null ? tokenResponse.errorDescription() : "null response"));
        }

        return tokenResponse;
    }

    public UserEntity verifyIdTokenAndUpsertUser(String idToken) {
        String url = "https://api.line.me/oauth2/v2.1/verify";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("id_token", idToken);
        body.add("client_id", lineProperties.getClientId());

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<LineVerifyRes> response = restTemplate.exchange(
                url, HttpMethod.POST, request, LineVerifyRes.class);

        LineVerifyRes verifyResponse = response.getBody();

        if (verifyResponse == null || verifyResponse.error() != null) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIAL,
                    "LINE id_token verification failed: "
                            + (verifyResponse != null ? verifyResponse.errorDescription() : "null response"));
        }

        UserEntity user = userRepository.findByUserSub(verifyResponse.sub()).orElse(null);

        if (user == null) {
            user = new UserEntity(
                    verifyResponse.email(),
                    verifyResponse.picture(),
                    verifyResponse.sub(),
                    verifyResponse.name(),
                    LocalDateTime.now());
        } else {
            user.setLastLoginAt(LocalDateTime.now());
            if (verifyResponse.email() != null) {
                user.setUserEmail(verifyResponse.email());
            }
            if (verifyResponse.picture() != null) {
                user.setUserPicture(verifyResponse.picture());
            }
            if (verifyResponse.name() != null) {
                user.setUserName(verifyResponse.name());
            }
        }

        return userRepository.save(user);
    }

    public LineProfileRes getProfile(String accessToken) {
        String url = "https://api.line.me/v2/profile";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<LineProfileRes> response = restTemplate.exchange(
                url, HttpMethod.GET, request, LineProfileRes.class);

        LineProfileRes profile = response.getBody();

        if (profile == null || profile.userId() == null) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIAL, "Failed to fetch LINE profile");
        }

        return profile;
    }

    public AuthRes loginWithLine(String code) {
        LineTokenRes tokenResponse = exchangeToken(code);
        UserEntity user = verifyIdTokenAndUpsertUser(tokenResponse.idToken());
        LineProfileRes profile = getProfile(tokenResponse.accessToken());

        String jwt = jwtUtil.generateToken(user.getUserId().toString(), profile.displayName());

        return new AuthRes(
                jwt,
                user.getUserId(),
                profile.userId(),
                profile.displayName(),
                profile.pictureUrl());
    }
}
