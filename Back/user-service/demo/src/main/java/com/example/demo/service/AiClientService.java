package com.example.demo.service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.example.demo.config.AiServiceProperties;
import com.example.demo.dto.req.AiAgriPriceBriefReq;
import com.example.demo.dto.req.AiAgriPriceExtractReq;
import com.example.demo.dto.req.AiWeatherBriefReq;
import com.example.demo.dto.req.AiWeatherWarningReq;
import com.example.demo.dto.res.AgriPriceLatestQuoteRes;
import com.example.demo.dto.res.AiAgriPriceBriefRes;
import com.example.demo.dto.res.AiAgriPriceExtractRes;
import com.example.demo.dto.res.AiParseRes;
import com.example.demo.dto.res.AiWeatherBriefRes;
import com.example.demo.dto.res.AiWeatherWarningRes;

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

    /**
     * เรียก ai-service POST /weather-warning/summarize — return null ถ้าพังหรือ timeout
     */
    public AiWeatherWarningRes summarizeWeatherWarning(String descriptionThai) {
        long t0 = System.currentTimeMillis();
        try {
            URI uri = UriComponentsBuilder
                    .fromUriString(props.getBaseUrl())
                    .path(props.getWeatherWarningPath())
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            HttpEntity<AiWeatherWarningReq> entity =
                    new HttpEntity<>(new AiWeatherWarningReq(descriptionThai), headers);

            ResponseEntity<AiWeatherWarningRes> resp =
                    restTemplate.exchange(uri, HttpMethod.POST, entity, AiWeatherWarningRes.class);
            log.info("[weather-warning:ai-service] call ok elapsedMs={}", System.currentTimeMillis() - t0);
            return resp.getBody();
        } catch (Exception e) {
            log.error("[weather-warning:ai-service] call failed elapsedMs={}: {}",
                    System.currentTimeMillis() - t0, e.getMessage(), e);
            return null;
        }
    }

    /**
     * เรียก ai-service POST /weather-brief/summarize — return null ถ้าพังหรือ timeout
     */
    public AiWeatherBriefRes summarizeWeatherBrief(String hourlyForecast, String descriptionThai) {
        long t0 = System.currentTimeMillis();
        try {
            URI uri = UriComponentsBuilder
                    .fromUriString(props.getBaseUrl())
                    .path(props.getWeatherBriefPath())
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            HttpEntity<AiWeatherBriefReq> entity =
                    new HttpEntity<>(new AiWeatherBriefReq(hourlyForecast, descriptionThai), headers);

            ResponseEntity<AiWeatherBriefRes> resp =
                    restTemplate.exchange(uri, HttpMethod.POST, entity, AiWeatherBriefRes.class);
            log.info("[weather-brief:ai-service] call ok elapsedMs={}", System.currentTimeMillis() - t0);
            return resp.getBody();
        } catch (Exception e) {
            log.error("[weather-brief:ai-service] call failed elapsedMs={}: {}",
                    System.currentTimeMillis() - t0, e.getMessage(), e);
            return null;
        }
    }

    /**
     * เรียก ai-service POST /agri-price/extract — return null ถ้าพังหรือ timeout
     */
    public AiAgriPriceExtractRes extractAgriPriceQuery(String text) {
        long t0 = System.currentTimeMillis();
        try {
            URI uri = UriComponentsBuilder
                    .fromUriString(props.getBaseUrl())
                    .path(props.getAgriPriceExtractPath())
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            HttpEntity<AiAgriPriceExtractReq> entity =
                    new HttpEntity<>(new AiAgriPriceExtractReq(text), headers);

            ResponseEntity<AiAgriPriceExtractRes> resp =
                    restTemplate.exchange(uri, HttpMethod.POST, entity, AiAgriPriceExtractRes.class);
            log.info("[agri-price-extract:ai-service] call ok elapsedMs={}", System.currentTimeMillis() - t0);
            return resp.getBody();
        } catch (Exception e) {
            log.error("[agri-price-extract:ai-service] call failed elapsedMs={}: {}",
                    System.currentTimeMillis() - t0, e.getMessage(), e);
            return null;
        }
    }

    /**
     * เรียก ai-service POST /agri-price/summarize — return null ถ้าพังหรือ timeout
     */
    public AiAgriPriceBriefRes summarizeAgriPrice(String productQuery, List<AgriPriceLatestQuoteRes> quotes) {
        long t0 = System.currentTimeMillis();
        try {
            URI uri = UriComponentsBuilder
                    .fromUriString(props.getBaseUrl())
                    .path(props.getAgriPriceBriefPath())
                    .encode(StandardCharsets.UTF_8)
                    .build()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            HttpEntity<AiAgriPriceBriefReq> entity =
                    new HttpEntity<>(new AiAgriPriceBriefReq(productQuery, quotes), headers);

            ResponseEntity<AiAgriPriceBriefRes> resp =
                    restTemplate.exchange(uri, HttpMethod.POST, entity, AiAgriPriceBriefRes.class);
            log.info("[agri-price-brief:ai-service] call ok elapsedMs={}", System.currentTimeMillis() - t0);
            return resp.getBody();
        } catch (Exception e) {
            log.error("[agri-price-brief:ai-service] call failed elapsedMs={}: {}",
                    System.currentTimeMillis() - t0, e.getMessage(), e);
            return null;
        }
    }
}
