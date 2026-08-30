package com.example.demo.service;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import javax.xml.parsers.DocumentBuilderFactory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import com.example.demo.config.WeatherProperties;
import com.example.demo.dto.res.AiWeatherWarningRes;
import com.example.demo.dto.res.WeatherWarningRes;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;

@Service
public class WeatherWarningService {

    private static final Logger log = LoggerFactory.getLogger(WeatherWarningService.class);
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final WeatherProperties props;
    private final AiClientService aiClientService;
    private final RestTemplate restTemplate;

    private volatile CachedWarning cache;

    public WeatherWarningService(WeatherProperties props, AiClientService aiClientService) {
        this.props = props;
        this.aiClientService = aiClientService;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int millis = (int) Duration.ofSeconds(Math.max(props.getTimeoutSeconds(), 5)).toMillis();
        factory.setConnectTimeout(millis);
        factory.setReadTimeout(millis);
        this.restTemplate = new RestTemplate(factory);
        this.restTemplate.getMessageConverters().removeIf(StringHttpMessageConverter.class::isInstance);
        this.restTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));
        this.restTemplate.setErrorHandler(new DefaultResponseErrorHandler() {
            @Override
            public boolean hasError(ClientHttpResponse response) {
                return false;
            }
        });
    }

    public WeatherWarningRes latest() {
        ParsedWarning parsed;
        try {
            parsed = fetchAndParse();
        } catch (ApiException ex) {
            CachedWarning current = this.cache;
            if (current != null && current.data() != null) {
                log.warn("Weather warning fetch failed, using cache: {}", ex.getMessage());
                return current.data();
            }
            throw ex;
        }
        if (parsed == null) {
            CachedWarning current = this.cache;
            return current != null && current.data() != null ? current.data() : WeatherWarningRes.none();
        }
        WeatherWarningRes cached = cacheIfFresh(parsed.fingerprint());
        if (cached != null) {
            return cached;
        }
        WeatherWarningRes data = toResponse(parsed);
        this.cache = new CachedWarning(parsed.fingerprint(), Instant.now(), data);
        return data;
    }

    /** ดึง <DescriptionThai> จาก XML โดยไม่ผ่าน AI — ใช้ส่งให้ LINE weather-brief */
    public String latestDescriptionThai() {
        try {
            ParsedWarning parsed = fetchAndParse();
            return parsed == null ? null : blankToNull(parsed.descriptionThai());
        } catch (Exception ex) {
            log.warn("Weather warning description fetch failed: {}", ex.getMessage());
            return null;
        }
    }

    private WeatherWarningRes toResponse(ParsedWarning parsed) {
        String summary = summarize(parsed.descriptionThai());
        if (blankToNull(summary) == null) {
            summary = firstNonBlank(parsed.headlineThai(), parsed.titleThai());
        }
        return new WeatherWarningRes(
                true,
                parsed.issueNo(),
                parsed.titleThai(),
                parsed.announceDate(),
                parsed.effectStartDate(),
                parsed.effectEndDate(),
                summary,
                parsed.webUrlThai(),
                parsed.contactThai());
    }

    private String summarize(String descriptionThai) {
        String text = blankToNull(descriptionThai);
        if (text == null) {
            return null;
        }
        if (text.length() > 8000) {
            text = text.substring(0, 8000);
        }
        AiWeatherWarningRes ai = aiClientService.summarizeWeatherWarning(text);
        if (ai == null) {
            return null;
        }
        return blankToNull(ai.summary());
    }

    private ParsedWarning fetchAndParse() {
        String xml = fetchXml();
        return parseXml(xml);
    }

    private String fetchXml() {
        URI uri = buildWarningUri();
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, "LineApp/1.0");
        headers.setAccept(List.of(
                MediaType.APPLICATION_XML,
                MediaType.TEXT_XML,
                MediaType.TEXT_PLAIN,
                MediaType.ALL));
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    uri, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            int status = response.getStatusCode().value();
            if (status < 200 || status >= 300) {
                log.warn("Weather warning API HTTP {} body={}", status, truncate(response.getBody()));
                throw new ApiException(ErrorCode.WEATHER_API_ERROR, "Weather warning API request failed");
            }
            String body = response.getBody();
            if (body == null || body.isBlank()) {
                throw new ApiException(ErrorCode.WEATHER_API_ERROR, "Empty response from weather warning API");
            }
            return body;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Weather warning API request failed: {} {}", uri, ex.getMessage());
            throw new ApiException(ErrorCode.WEATHER_API_ERROR, "Weather warning API request failed");
        }
    }

    private URI buildWarningUri() {
        String base = props.getWarningUrl() == null || props.getWarningUrl().isBlank()
                ? "https://data.tmd.go.th/api/WeatherWarningNews/v2/"
                : props.getWarningUrl().trim();
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(base);
        String uid = blankToNull(props.getWarningUid());
        String ukey = blankToNull(props.getWarningUkey());
        if (uid != null) {
            builder.queryParam("uid", uid);
        }
        if (ukey != null) {
            builder.queryParam("ukey", ukey);
        }
        return builder.encode().build().toUri();
    }

    private ParsedWarning parseXml(String xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            try {
                factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            } catch (Exception ignored) {
                // keep default factory if the feature is unavailable
            }
            factory.setExpandEntityReferences(false);
            factory.setNamespaceAware(false);
            Document doc = factory.newDocumentBuilder()
                    .parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
            doc.getDocumentElement().normalize();

            NodeList warningNodes = doc.getElementsByTagName("Warning");
            List<Element> warnings = new ArrayList<>();
            for (int i = 0; i < warningNodes.getLength(); i++) {
                Node node = warningNodes.item(i);
                if (node instanceof Element element && "Warning".equals(element.getTagName())) {
                    warnings.add(element);
                }
            }
            if (warnings.isEmpty()) {
                String lastBuild = firstText(doc.getDocumentElement(), "lastBuildDate");
                this.cache = new CachedWarning(
                        "none|" + (lastBuild == null ? "" : lastBuild),
                        Instant.now(),
                        WeatherWarningRes.none());
                return null;
            }

            Element chosen = warnings.get(warnings.size() - 1);
            List<String> descriptions = new ArrayList<>();
            for (Element warning : warnings) {
                String description = firstText(warning, "DescriptionThai");
                if (description != null) {
                    descriptions.add(description);
                }
            }
            String descriptionThai = String.join("\n\n", descriptions);
            String issueNo = firstText(chosen, "IssueNo");
            String announceDate = firstText(chosen, "AnnounceDate");
            String fingerprint = (issueNo == null ? "" : issueNo)
                    + "|"
                    + (announceDate == null ? "" : announceDate)
                    + "|"
                    + Integer.toHexString(descriptionThai.hashCode());
            return new ParsedWarning(
                    fingerprint,
                    issueNo,
                    firstText(chosen, "TitleThai"),
                    firstText(chosen, "HeadlineThai"),
                    announceDate,
                    firstText(chosen, "EffectStartDate"),
                    firstText(chosen, "EffectEndDate"),
                    descriptionThai,
                    firstText(chosen, "WebUrlThai"),
                    firstText(chosen, "ContactThai"));
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Weather warning XML parse failed: {}", ex.getMessage());
            throw new ApiException(ErrorCode.WEATHER_API_ERROR, "Weather warning XML parse failed");
        }
    }

    private WeatherWarningRes cacheIfFresh(String fingerprint) {
        CachedWarning current = this.cache;
        if (current == null || !current.fingerprint().equals(fingerprint)) {
            return null;
        }
        if (Duration.between(current.savedAt(), Instant.now()).compareTo(CACHE_TTL) > 0) {
            return null;
        }
        return current.data();
    }

    private static String firstText(Element parent, String tag) {
        NodeList nodes = parent.getElementsByTagName(tag);
        if (nodes.getLength() == 0) {
            return null;
        }
        return blankToNull(nodes.item(0).getTextContent());
    }

    private static String firstNonBlank(String primary, String fallback) {
        String first = blankToNull(primary);
        return first != null ? first : blankToNull(fallback);
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String truncate(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        String trimmed = body.replaceAll("\\s+", " ").trim();
        return trimmed.length() <= 300 ? trimmed : trimmed.substring(0, 300);
    }

    private record ParsedWarning(
            String fingerprint,
            String issueNo,
            String titleThai,
            String headlineThai,
            String announceDate,
            String effectStartDate,
            String effectEndDate,
            String descriptionThai,
            String webUrlThai,
            String contactThai) {
    }

    private record CachedWarning(String fingerprint, Instant savedAt, WeatherWarningRes data) {
    }
}
