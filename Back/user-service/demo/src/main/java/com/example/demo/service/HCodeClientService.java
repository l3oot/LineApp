package com.example.demo.service;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.example.demo.config.HCodeProperties;
import com.example.demo.dto.res.ThaiAdminOptionRes;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@Service
public class HCodeClientService {

    private static final Logger log = LoggerFactory.getLogger(HCodeClientService.class);
    private static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(240);

    private final HCodeProperties props;
    private final RestTemplate restTemplate;

    private String accessToken;
    private String refreshToken;
    private Instant accessExpiresAt = Instant.EPOCH;

    public HCodeClientService(HCodeProperties props) {
        this.props = props;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int millis = (int) Duration.ofSeconds(props.getTimeoutSeconds()).toMillis();
        factory.setConnectTimeout(millis);
        factory.setReadTimeout(millis);
        this.restTemplate = new RestTemplate(factory);
    }

    public List<ThaiAdminOptionRes> listProvinces() {
        ensureConfigured();
        List<ProvinceDto> rows = fetchAllPages(
                "/api/province/",
                Map.of(),
                new ParameterizedTypeReference<HCodePageDto<ProvinceDto>>() {});
        return toOptions(rows, ProvinceDto::code, ProvinceDto::name);
    }

    public List<ThaiAdminOptionRes> listDistricts(String provinceCode) {
        ensureConfigured();
        if (provinceCode == null || provinceCode.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "provinceCode is required");
        }
        List<DistrictDto> rows = fetchAllPages(
                "/api/district/",
                Map.of("province_code", provinceCode.trim()),
                new ParameterizedTypeReference<HCodePageDto<DistrictDto>>() {});
        return toOptions(rows, DistrictDto::code, DistrictDto::name);
    }

    public List<ThaiAdminOptionRes> listSubdistricts(String districtCode) {
        ensureConfigured();
        if (districtCode == null || districtCode.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "districtCode is required");
        }
        List<SubdistrictDto> rows = fetchAllPages(
                "/api/subdistrict/",
                Map.of("district_code", districtCode.trim()),
                new ParameterizedTypeReference<HCodePageDto<SubdistrictDto>>() {});
        return toOptions(rows, SubdistrictDto::code, SubdistrictDto::name);
    }

    private <T> List<ThaiAdminOptionRes> toOptions(
            List<T> rows,
            Function<T, String> codeFn,
            Function<T, String> nameFn) {
        return rows.stream()
                .map(row -> new ThaiAdminOptionRes(codeFn.apply(row), nameFn.apply(row)))
                .sorted(Comparator.comparing(ThaiAdminOptionRes::name))
                .toList();
    }

    private void ensureConfigured() {
        if (!props.isConfigured()) {
            throw new ApiException(
                    ErrorCode.HCODE_NOT_CONFIGURED,
                    "HCode API credentials are not configured (HCODE_USERNAME / HCODE_PASSWORD)");
        }
    }

    private synchronized String getAccessToken() {
        if (accessToken != null && Instant.now().isBefore(accessExpiresAt.minus(Duration.ofMinutes(5)))) {
            return accessToken;
        }
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshAccessToken();
            return accessToken;
        }
        login();
        return accessToken;
    }

    private void login() {
        Map<String, String> body = Map.of(
                "username", props.getUsername().trim(),
                "password", props.getPassword());
        TokenResponse token = postJson("/api/token/", body, TokenResponse.class, false);
        applyTokens(token);
    }

    private void refreshAccessToken() {
        Map<String, String> body = Map.of("refresh", refreshToken);
        TokenResponse token = postJson("/api/token/refresh/", body, TokenResponse.class, false);
        if (token.access() != null && !token.access().isBlank()) {
            accessToken = token.access();
            accessExpiresAt = Instant.now().plus(ACCESS_TOKEN_TTL);
        } else {
            login();
        }
    }

    private void applyTokens(TokenResponse token) {
        if (token.access() == null || token.access().isBlank()) {
            throw new ApiException(ErrorCode.HCODE_API_ERROR, "HCode token response missing access token");
        }
        accessToken = token.access();
        if (token.refresh() != null && !token.refresh().isBlank()) {
            refreshToken = token.refresh();
        }
        accessExpiresAt = Instant.now().plus(ACCESS_TOKEN_TTL);
    }

    private <T> List<T> fetchAllPages(
            String path,
            Map<String, String> filters,
            ParameterizedTypeReference<HCodePageDto<T>> typeRef) {
        List<T> all = new ArrayList<>();
        String nextUrl = null;
        int page = 1;

        do {
            URI uri;
            if (nextUrl != null) {
                uri = URI.create(nextUrl);
            } else {
                UriComponentsBuilder builder = UriComponentsBuilder
                        .fromUriString(normalizeBaseUrl() + path)
                        .queryParam("page_size", props.getPageSize())
                        .queryParam("page", page);
                filters.forEach(builder::queryParam);
                uri = builder.build(true).toUri();
            }

            HCodePageDto<T> pageDto = exchange(uri, typeRef);
            if (pageDto.results() != null) {
                all.addAll(pageDto.results());
            }
            nextUrl = pageDto.next();
            page++;
        } while (nextUrl != null);

        return all;
    }

    private <T> HCodePageDto<T> exchange(URI uri, ParameterizedTypeReference<HCodePageDto<T>> typeRef) {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(getAccessToken());
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<HCodePageDto<T>> response = restTemplate.exchange(uri, HttpMethod.GET, entity, typeRef);
            HCodePageDto<T> body = response.getBody();
            if (body == null) {
                throw new ApiException(ErrorCode.HCODE_API_ERROR, "Empty response from HCode API");
            }
            return body;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("HCode API request failed: {}", ex.getMessage(), ex);
            throw new ApiException(ErrorCode.HCODE_API_ERROR, "HCode API request failed: " + ex.getMessage());
        }
    }

    private <T> T postJson(String path, Object body, Class<T> responseClass, boolean auth) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        if (auth) {
            headers.setBearerAuth(getAccessToken());
        }
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<T> response = restTemplate.postForEntity(normalizeBaseUrl() + path, entity, responseClass);
            T responseBody = response.getBody();
            if (responseBody == null) {
                throw new ApiException(ErrorCode.HCODE_API_ERROR, "Empty response from HCode API");
            }
            return responseBody;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("HCode API POST failed: {}", ex.getMessage(), ex);
            throw new ApiException(ErrorCode.HCODE_API_ERROR, "HCode API request failed: " + ex.getMessage());
        }
    }

    private String normalizeBaseUrl() {
        return props.getBaseUrl().replaceAll("/+$", "");
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TokenResponse(
            String access,
            String refresh) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record HCodePageDto<T>(
            int count,
            String next,
            String previous,
            List<T> results) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ProvinceDto(
            int id,
            String code,
            String name,
            @JsonProperty("en_name") String enName) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DistrictDto(
            int id,
            String code,
            String name,
            @JsonProperty("en_name") String enName,
            @JsonProperty("province_code") String provinceCode) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record SubdistrictDto(
            int id,
            String code,
            String name,
            @JsonProperty("en_name") String enName,
            @JsonProperty("district_code") String districtCode) {
    }
}
