package com.example.demo.service;

import java.time.Duration;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.service.ProductImageService.PreparedImage;

/**
 * Uploads files to Supabase Storage via REST API using the service role key.
 * Public URL pattern:
 * {base}/storage/v1/object/public/{bucket}/{path}
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String serviceKey;
    private final String bucket;

    public FileStorageService(
            @Value("${file-storage.base-url:}") String baseUrl,
            @Value("${file-storage.service-key:}") String serviceKey,
            @Value("${file-storage.bucket:product}") String bucket,
            @Value("${file-storage.timeout-seconds:20}") int timeoutSeconds) {
        this.baseUrl = trimTrailingSlash(baseUrl == null ? "" : baseUrl.trim());
        this.serviceKey = serviceKey == null ? "" : serviceKey.trim();
        this.bucket = bucket == null || bucket.isBlank() ? "product" : bucket.trim();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int millis = (int) Duration.ofSeconds(Math.max(timeoutSeconds, 5)).toMillis();
        factory.setConnectTimeout(millis);
        factory.setReadTimeout(millis);
        this.restTemplate = new RestTemplate(factory);
    }

    public boolean isConfigured() {
        return !baseUrl.isBlank() && !serviceKey.isBlank();
    }

    public String publicUrl(String imagePath) {
        if (imagePath == null || imagePath.isBlank()) {
            return null;
        }
        return baseUrl + "/storage/v1/object/public/" + bucket + "/" + stripLeadingSlash(imagePath);
    }

    /** Uploads prepared image bytes; returns storage path (not full URL). */
    public String uploadProductImage(UUID userId, PreparedImage image) {
        ensureConfigured();
        String path = userId + "/" + UUID.randomUUID() + "." + image.extension();
        String url = baseUrl + "/storage/v1/object/" + bucket + "/" + path;

        HttpHeaders headers = authHeaders();
        headers.setContentType(MediaType.parseMediaType(image.contentType()));
        headers.set("x-upsert", "true");

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    new HttpEntity<>(image.bytes(), headers),
                    String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                log.warn("Supabase upload non-2xx status={} body={}", response.getStatusCode(), response.getBody());
                throw new ApiException(ErrorCode.FILE_STORAGE_UPLOAD_FAILED, "อัปโหลดรูปสินค้าไม่สำเร็จ");
            }
            return path;
        } catch (ApiException ex) {
            throw ex;
        } catch (RestClientException ex) {
            log.warn("Supabase upload failed: {}", ex.getMessage());
            throw new ApiException(ErrorCode.FILE_STORAGE_UPLOAD_FAILED, "อัปโหลดรูปสินค้าไม่สำเร็จ");
        }
    }

    public void deleteIfPresent(String imagePath) {
        if (!isConfigured() || imagePath == null || imagePath.isBlank()) {
            return;
        }
        String url = baseUrl + "/storage/v1/object/" + bucket + "/" + stripLeadingSlash(imagePath);
        try {
            restTemplate.exchange(url, HttpMethod.DELETE, new HttpEntity<>(authHeaders()), String.class);
        } catch (RestClientException ex) {
            log.warn("Supabase delete failed path={}: {}", imagePath, ex.getMessage());
        }
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new ApiException(
                    ErrorCode.FILE_STORAGE_NOT_CONFIGURED,
                    "ยังไม่ได้ตั้งค่า FILE_STORAGE_BASE_URL / SUPABASE_SERVICE_KEY");
        }
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + serviceKey);
        headers.set("apikey", serviceKey);
        return headers;
    }

    private static String trimTrailingSlash(String value) {
        if (value.endsWith("/")) {
            return value.substring(0, value.length() - 1);
        }
        return value;
    }

    private static String stripLeadingSlash(String value) {
        return value.startsWith("/") ? value.substring(1) : value;
    }
}
