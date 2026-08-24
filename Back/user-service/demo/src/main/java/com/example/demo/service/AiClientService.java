package com.example.demo.service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.example.demo.config.AiServiceProperties;
import com.example.demo.dto.res.AiParseRes;

/**
 * Client เรียก ai-service (FastAPI) สำหรับ extract รายการ
 *
 * <p>endpoint: {@code GET {baseUrl}{parsePath}?text=<text>&userId=<uuid>}
 */
@Service
public class AiClientService {

    private static final Logger log = LoggerFactory.getLogger(AiClientService.class);

    private final AiServiceProperties props;
    private final RestTemplate restTemplate;

    public AiClientService(AiServiceProperties props) {
        this.props = props;
        // RestTemplate แยกตัวเพราะตั้ง timeout ยาวกว่า bean default (LLM อาจช้า)
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int millis = (int) Duration.ofSeconds(props.getTimeoutSeconds()).toMillis();
        factory.setConnectTimeout(millis);
        factory.setReadTimeout(millis);
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * เรียก ai-service /parse — return null ถ้า ai-service พังหรือ timeout (เพื่อให้ caller fallback ได้)
     */
    public AiParseRes parse(String text, UUID userId) {
        long t0 = System.currentTimeMillis();
        try {
            URI uri = UriComponentsBuilder
                    .fromUriString(props.getBaseUrl())
                    .path(props.getParsePath())
                    .queryParam("text", text)
                    .queryParamIfPresent("userId", userId == null ? java.util.Optional.empty() : java.util.Optional.of(userId.toString()))
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();

            ResponseEntity<AiParseRes> resp = restTemplate.exchange(uri, HttpMethod.GET, null, AiParseRes.class);
            log.info("[step1:ai-service] call ai-service ok elapsedMs={}", System.currentTimeMillis() - t0);
            return resp.getBody();
        } catch (Exception e) {
            log.error("[step1:ai-service] call ai-service failed elapsedMs={}: {}",
                    System.currentTimeMillis() - t0, e.getMessage(), e);
            return null;
        }
    }
}
