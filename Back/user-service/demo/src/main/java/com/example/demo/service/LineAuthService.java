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
import com.example.demo.dto.ApiRes;
import com.example.demo.dto.res.AuthRes;
import com.example.demo.dto.res.LineProfileRes;
import com.example.demo.dto.res.LineTokenRes;
import com.example.demo.dto.res.LineVerifyRes;
import com.example.demo.entity.UserEntity;
import com.example.demo.enums.TypeError;
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

    // Step 1: แลก code → access_token + id_token
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
                url, HttpMethod.POST, request, LineTokenRes.class
        );

        LineTokenRes tokenResponse = response.getBody();

        if (tokenResponse == null || tokenResponse.getError() != null) {
            throw new RuntimeException("LINE token exchange failed: "
                    + (tokenResponse != null ? tokenResponse.getErrorDescription() : "null response"));
        }

        return tokenResponse;
    }

    // Step 2: Verify id_token กับ LINE server แล้ว upsert UserEntity — คืน user ที่เพิ่ง save
    public UserEntity verifyIdTokenAndUpsertUser(String idToken) {
        String url = "https://api.line.me/oauth2/v2.1/verify";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("id_token", idToken);
        body.add("client_id", lineProperties.getClientId());

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<LineVerifyRes> response = restTemplate.exchange(
                url, HttpMethod.POST, request, LineVerifyRes.class
        );

        LineVerifyRes verifyResponse = response.getBody();

        if (verifyResponse == null || verifyResponse.getError() != null) {
            throw new RuntimeException("LINE id_token verification failed: "
                    + (verifyResponse != null ? verifyResponse.getErrorDescription() : "null response"));
        }

        UserEntity user = userRepository.findByUserSub(verifyResponse.getSub()).orElse(null);

        if (user == null) {
            user = new UserEntity(
                    verifyResponse.getEmail(),
                    verifyResponse.getPicture(),
                    verifyResponse.getSub(),
                    verifyResponse.getName(),
                    LocalDateTime.now()
            );
        } else {
            user.setLastLoginAt(LocalDateTime.now());
            // อัปเดต profile ล่าสุดจาก LINE เผื่อผู้ใช้แก้รูป/ชื่อ
            if (verifyResponse.getEmail() != null) {
                user.setUserEmail(verifyResponse.getEmail());
            }
            if (verifyResponse.getPicture() != null) {
                user.setUserPicture(verifyResponse.getPicture());
            }
            if (verifyResponse.getName() != null) {
                user.setUserName(verifyResponse.getName());
            }
        }

        return userRepository.save(user);
    }

    // Step 3: ดึง Profile ด้วย access_token
    public LineProfileRes getProfile(String accessToken) {
        String url = "https://api.line.me/v2/profile";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<LineProfileRes> response = restTemplate.exchange(
                url, HttpMethod.GET, request, LineProfileRes.class
        );

        LineProfileRes profile = response.getBody();

        if (profile == null || profile.getUserId() == null) {
            throw new RuntimeException("Failed to fetch LINE profile");
        }

        return profile;
    }

    // รวม flow ทั้งหมด — คืน UUID ของระบบใน AuthRes (frontend ใช้เป็น userId ตอนเรียก API อื่น)
    public ApiRes<AuthRes> loginWithLine(String code) {
        try {
            LineTokenRes tokenResponse = exchangeToken(code);
            UserEntity user = verifyIdTokenAndUpsertUser(tokenResponse.getIdToken());
            LineProfileRes profile = getProfile(tokenResponse.getAccessToken());

            // JWT subject = UUID ของระบบ (ไม่ใช่ LINE userId) — ใช้ระบุ user เวลา validate token
            String jwt = jwtUtil.generateToken(user.getUserId().toString(), profile.getDisplayName());

            AuthRes response = new AuthRes(
                    jwt,
                    user.getUserId(),
                    profile.getUserId(),
                    profile.getDisplayName(),
                    profile.getPictureUrl()
            );

            return ApiRes.success(response, "Login Success");

        } catch (RuntimeException e) {
            return ApiRes.failure(e.getMessage(), TypeError.INVALID_CREDENTIAL);
        }
    }
}
