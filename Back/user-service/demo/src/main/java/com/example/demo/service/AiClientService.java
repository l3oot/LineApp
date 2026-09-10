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
import com.example.demo.dto.req.AiCycleSummaryReq;
import com.example.demo.dto.req.AiWeatherBriefReq;
import com.example.demo.dto.req.AiWeatherWarningReq;
import com.example.demo.dto.res.AgriPriceLatestQuoteRes;
import com.example.demo.dto.res.AiAgriPriceBriefRes;
import com.example.demo.dto.res.AiAgriPriceExtractRes;
import com.example.demo.dto.res.AiCycleSummaryRes;
import com.example.demo.dto.res.AiParseRes;
import com.example.demo.dto.res.AiWeatherBriefRes;
import com.example.demo.dto.res.AiWeatherWarningRes;
import com.example.demo.util.AiLatency;

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
        URI uri = UriComponentsBuilder
                .fromUriString(props.getBaseUrl())
                .path(props.getParsePath())
                .queryParam("text", text)
                .queryParamIfPresent("userId", userId == null ? java.util.Optional.empty() : java.util.Optional.of(userId.toString()))
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUri();
        return callAi(props.getParsePath(), uri, HttpMethod.GET, new HttpEntity<>(latencyHeaders(null)), AiParseRes.class);
    }

    /**
     * เรียก ai-service POST /weather-warning/summarize — return null ถ้าพังหรือ timeout
     */
    public AiWeatherWarningRes summarizeWeatherWarning(String descriptionThai) {
        URI uri = aiUri(props.getWeatherWarningPath());
        HttpEntity<AiWeatherWarningReq> entity =
                new HttpEntity<>(new AiWeatherWarningReq(descriptionThai), latencyHeaders(MediaType.APPLICATION_JSON));
        return callAi(props.getWeatherWarningPath(), uri, HttpMethod.POST, entity, AiWeatherWarningRes.class);
    }

    /**
     * เรียก ai-service POST /weather-brief/summarize — return null ถ้าพังหรือ timeout
     */
    public AiWeatherBriefRes summarizeWeatherBrief(String hourlyForecast) {
        URI uri = aiUri(props.getWeatherBriefPath());
        HttpEntity<AiWeatherBriefReq> entity =
                new HttpEntity<>(new AiWeatherBriefReq(hourlyForecast), latencyHeaders(MediaType.APPLICATION_JSON));
        return callAi(props.getWeatherBriefPath(), uri, HttpMethod.POST, entity, AiWeatherBriefRes.class);
    }

    /**
     * เรียก ai-service POST /agri-price/extract — return null ถ้าพังหรือ timeout
     */
    public AiAgriPriceExtractRes extractAgriPriceQuery(String text) {
        URI uri = aiUri(props.getAgriPriceExtractPath());
        HttpEntity<AiAgriPriceExtractReq> entity =
                new HttpEntity<>(new AiAgriPriceExtractReq(text), latencyHeaders(MediaType.APPLICATION_JSON));
        return callAi(props.getAgriPriceExtractPath(), uri, HttpMethod.POST, entity, AiAgriPriceExtractRes.class);
    }

    /**
     * เรียก ai-service POST /agri-price/summarize — return null ถ้าพังหรือ timeout
     */
    public AiAgriPriceBriefRes summarizeAgriPrice(String productQuery, List<AgriPriceLatestQuoteRes> quotes) {
        URI uri = aiUri(props.getAgriPriceBriefPath());
        HttpEntity<AiAgriPriceBriefReq> entity =
                new HttpEntity<>(new AiAgriPriceBriefReq(productQuery, quotes), latencyHeaders(MediaType.APPLICATION_JSON));
        return callAi(props.getAgriPriceBriefPath(), uri, HttpMethod.POST, entity, AiAgriPriceBriefRes.class);
    }

    /**
     * เรียก ai-service POST /cycle-summary/summarize — return null ถ้าพังหรือ timeout
     */
    public AiCycleSummaryRes summarizeCycle(String cycleInfo, String transactionData) {
        URI uri = aiUri(props.getCycleSummaryPath());
        HttpEntity<AiCycleSummaryReq> entity =
                new HttpEntity<>(new AiCycleSummaryReq(cycleInfo, transactionData), latencyHeaders(MediaType.APPLICATION_JSON));
        return callAi(props.getCycleSummaryPath(), uri, HttpMethod.POST, entity, AiCycleSummaryRes.class);
    }

    private URI aiUri(String path) {
        return UriComponentsBuilder
                .fromUriString(props.getBaseUrl())
                .path(path)
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUri();
    }

    private HttpHeaders latencyHeaders(MediaType contentType) {
        HttpHeaders headers = new HttpHeaders();
        if (contentType != null) {
            headers.setContentType(contentType);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        }
        String reqId = AiLatency.current();
        if (reqId != null && !reqId.isBlank()) {
            headers.set(AiLatency.HEADER, reqId);
        }
        return headers;
    }

    private <T> T callAi(String path, URI uri, HttpMethod method, HttpEntity<?> entity, Class<T> type) {
        String reqId = AiLatency.currentOrDash();
        long t0 = System.currentTimeMillis();
        log.info("[ai-latency] hop=user→ai reqId={} action=start path={}", reqId, path);
        try {
            ResponseEntity<T> resp = restTemplate.exchange(uri, method, entity, type);
            log.info("[ai-latency] hop=user→ai reqId={} action=done path={} status={} elapsedMs={}",
                    reqId, path, resp.getStatusCode().value(), System.currentTimeMillis() - t0);
            return resp.getBody();
        } catch (Exception e) {
            log.error("[ai-latency] hop=user→ai reqId={} action=fail path={} elapsedMs={} error={}",
                    reqId, path, System.currentTimeMillis() - t0, e.getMessage(), e);
            return null;
        }
    }
}
