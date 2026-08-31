package com.example.demo.service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

import com.example.demo.config.WeatherProperties;
import com.example.demo.dto.req.WeatherForecastQuery;
import com.example.demo.dto.res.WeatherForecastRes;
import com.example.demo.dto.res.WeatherHourRes;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.util.AppTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class WeatherClientService {

    private static final Logger log = LoggerFactory.getLogger(WeatherClientService.class);
    private static final String DATE_UNAVAILABLE = "Weather forecast not available for this date";

    private final WeatherProperties props;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public WeatherClientService(WeatherProperties props) {
        this.props = props;
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

    public WeatherForecastRes forecast(WeatherForecastQuery query) {
        return loadForecast(query, "/v1/forecast/location/hourly/place", 1, 48, props.getDurationHours(), true);
    }

    public WeatherForecastRes forecastDaily(WeatherForecastQuery query) {
        return loadForecast(query, "/v1/forecast/location/daily/place", 1, 126, 7, false);
    }

    private WeatherForecastRes loadForecast(
            WeatherForecastQuery query,
            String path,
            int minDuration,
            int maxDuration,
            int defaultDuration,
            boolean includeHour) {
        ensureConfigured();
        WeatherForecastQuery normalized = normalize(query, minDuration, maxDuration, defaultDuration, includeHour);

        TmdEnvelope envelope = fetchPlace(normalized, path, includeHour);
        if (isEmpty(envelope)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "Weather forecast not found for this place");
        }

        TmdPlace first = envelope.weatherForecasts().get(0);
        List<WeatherHourRes> hours = mapHours(first.forecasts());
        if (hours.isEmpty()) {
            throw new ApiException(ErrorCode.NOT_FOUND, "Weather forecast not found for this place");
        }

        WeatherHourRes current = pickCurrent(hours);
        List<WeatherHourRes> upcoming = hours.stream()
                .filter(hour -> !hour.time().equals(current.time()))
                .toList();

        TmdLocation location = first.location();
        return new WeatherForecastRes(
                locationLabel(location, normalized),
                firstNonBlank(location != null ? location.province() : null, normalized.province()),
                firstNonBlank(location != null ? location.amphoe() : null, normalized.amphoe()),
                firstNonBlank(location != null ? location.tambon() : null, normalized.tambon()),
                current,
                upcoming);
    }

    private WeatherForecastQuery normalize(
            WeatherForecastQuery query,
            int minDuration,
            int maxDuration,
            int defaultDuration,
            boolean includeHour) {
        WeatherForecastQuery source = query == null
                ? new WeatherForecastQuery(null, null, null, null, null, null)
                : query;
        Integer hour = includeHour ? source.hour() : null;
        if (hour != null && (hour < 0 || hour > 23)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "hour must be 0-23");
        }
        Integer duration = source.duration();
        if (duration != null && (duration < minDuration || duration > maxDuration)) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "duration must be " + minDuration + "-" + maxDuration);
        }
        String date = blankToNull(source.date());
        if (date != null && !date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "date must be YYYY-MM-DD");
        }
        int span = duration != null ? duration : Math.max(minDuration, Math.min(maxDuration, defaultDuration));
        return new WeatherForecastQuery(
                blankToNull(source.province()),
                blankToNull(source.amphoe()),
                blankToNull(source.tambon()),
                date,
                hour,
                span);
    }

    private TmdEnvelope fetchPlace(WeatherForecastQuery query, String path, boolean includeHour) {
        try {
            TmdEnvelope envelope = requestPlace(query, path, includeHour);
            if (!isEmpty(envelope)) {
                return envelope;
            }
        } catch (ApiException ex) {
            boolean dropPlace = ex.getErrorCode() == ErrorCode.NOT_FOUND
                    && !DATE_UNAVAILABLE.equals(ex.getMessage());
            if (!dropPlace || (query.tambon() == null && query.amphoe() == null)) {
                throw ex;
            }
            log.warn("Weather API retry after: {}", ex.getMessage());
        }
        if (query.tambon() != null) {
            return fetchPlace(
                    new WeatherForecastQuery(
                            query.province(), query.amphoe(), null, query.date(), query.hour(), query.duration()),
                    path,
                    includeHour);
        }
        if (query.amphoe() != null) {
            return fetchPlace(
                    new WeatherForecastQuery(
                            query.province(), null, null, query.date(), query.hour(), query.duration()),
                    path,
                    includeHour);
        }
        throw new ApiException(ErrorCode.NOT_FOUND, "Weather forecast not found for this place");
    }

    private TmdEnvelope requestPlace(WeatherForecastQuery query, String path, boolean includeHour) {
        Map<String, String> params = new LinkedHashMap<>();
        putIfPresent(params, "province", query.province());
        putIfPresent(params, "amphoe", query.amphoe());
        putIfPresent(params, "tambon", query.tambon());
        putIfPresent(params, "date", query.date());
        if (includeHour && query.hour() != null) {
            params.put("hour", String.valueOf(query.hour()));
        }
        if (query.duration() != null) {
            params.put("duration", String.valueOf(query.duration()));
        }

        URI uri = buildUri(path, params);
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + props.getToken().trim());
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    uri, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            int status = response.getStatusCode().value();
            if (status < 200 || status >= 300) {
                log.warn("Weather API HTTP {} body={} uri={}", status, truncate(response.getBody()), uri);
                throw tmdHttpError(status);
            }
            String body = response.getBody();
            if (body == null || body.isBlank()) {
                throw new ApiException(ErrorCode.WEATHER_API_ERROR, "Empty response from weather API");
            }
            return objectMapper.readValue(body, TmdEnvelope.class);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Weather API request failed: {} {}", uri, ex.getMessage());
            throw new ApiException(ErrorCode.WEATHER_API_ERROR, "Weather API request failed");
        }
    }

    private static ApiException tmdHttpError(int status) {
        if (status == 400 || status == 422) {
            return new ApiException(ErrorCode.NOT_FOUND, DATE_UNAVAILABLE);
        }
        if (status == 404) {
            return new ApiException(ErrorCode.NOT_FOUND, "Weather forecast not found for this place");
        }
        return new ApiException(ErrorCode.WEATHER_API_ERROR, "Weather API request failed");
    }

    private List<WeatherHourRes> mapHours(List<TmdForecast> forecasts) {
        if (forecasts == null || forecasts.isEmpty()) {
            return List.of();
        }
        List<WeatherHourRes> hours = new ArrayList<>();
        for (TmdForecast forecast : forecasts) {
            if (forecast == null || forecast.time() == null || forecast.data() == null) {
                continue;
            }
            TmdData data = forecast.data();
            Integer min = roundNullable(data.temperatureMin());
            Integer max = roundNullable(data.temperatureMax());
            Integer mean = roundNullable(data.temperature());
            if (mean == null && min != null && max != null) {
                mean = (int) Math.round((min + max) / 2.0);
            }
            if (mean == null) {
                continue;
            }
            int temperature = mean;
            int humidity = data.humidity() == null ? 0 : (int) Math.round(data.humidity());
            hours.add(new WeatherHourRes(
                    forecast.time(),
                    temperature,
                    humidity,
                    normalizeCondition(data.condition()),
                    min,
                    max));
        }
        hours.sort(Comparator.comparing(WeatherHourRes::time));
        return hours;
    }

    private WeatherHourRes pickCurrent(List<WeatherHourRes> hours) {
        ZonedDateTime now = ZonedDateTime.now(AppTime.ZONE);
        WeatherHourRes closest = hours.get(0);
        long best = Long.MAX_VALUE;
        for (WeatherHourRes hour : hours) {
            try {
                long diff = Math.abs(Duration.between(OffsetDateTime.parse(hour.time()), now).toMinutes());
                if (diff < best) {
                    best = diff;
                    closest = hour;
                }
            } catch (RuntimeException ignored) {
                // keep current closest
            }
        }
        return closest;
    }

    private String locationLabel(TmdLocation location, WeatherForecastQuery query) {
        String tambon = firstNonBlank(location != null ? location.tambon() : null, query.tambon());
        String amphoe = firstNonBlank(location != null ? location.amphoe() : null, query.amphoe());
        String province = firstNonBlank(location != null ? location.province() : null, query.province());
        List<String> parts = new ArrayList<>();
        if (tambon != null) {
            parts.add(tambon);
        }
        if (amphoe != null) {
            parts.add(amphoe);
        }
        if (province != null) {
            parts.add(province);
        }
        if (!parts.isEmpty()) {
            return String.join(" · ", parts);
        }
        return location != null && blankToNull(location.name()) != null ? location.name().trim() : "";
    }

    private void ensureConfigured() {
        if (props.getToken() == null || props.getToken().isBlank()) {
            throw new ApiException(ErrorCode.WEATHER_NOT_CONFIGURED, "Weather API token is not configured");
        }
    }

    private boolean isEmpty(TmdEnvelope envelope) {
        return envelope == null || envelope.weatherForecasts() == null || envelope.weatherForecasts().isEmpty();
    }

    private URI buildUri(String path, Map<String, String> query) {
        String base = props.getBaseUrl() == null ? "https://data.tmd.go.th/nwpapi" : props.getBaseUrl().trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(base + path);
        query.forEach((key, value) -> {
            if (value != null && !value.isBlank()) {
                builder.queryParam(key, value);
            }
        });
        return builder.encode().build().toUri();
    }

    private static String truncate(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        String trimmed = body.replaceAll("\\s+", " ").trim();
        return trimmed.length() <= 300 ? trimmed : trimmed.substring(0, 300);
    }

    private static Integer roundNullable(Double value) {
        return value == null ? null : (int) Math.round(value);
    }

    private static int normalizeCondition(Integer condition) {
        if (condition == null || condition < 1 || condition > 12) {
            return 0;
        }
        return condition;
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String firstNonBlank(String primary, String fallback) {
        String first = blankToNull(primary);
        return first != null ? first : blankToNull(fallback);
    }

    private static void putIfPresent(Map<String, String> query, String key, String value) {
        String trimmed = blankToNull(value);
        if (trimmed != null) {
            query.put(key, trimmed);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TmdEnvelope(
            @JsonProperty("WeatherForecasts") List<TmdPlace> weatherForecasts) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TmdPlace(
            TmdLocation location,
            List<TmdForecast> forecasts) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TmdLocation(
            String province,
            String amphoe,
            String tambon,
            String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TmdForecast(
            String time,
            TmdData data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TmdData(
            @JsonProperty("tc") Double temperature,
            @JsonProperty("tc_max") Double temperatureMax,
            @JsonProperty("tc_min") Double temperatureMin,
            @JsonProperty("rh") Double humidity,
            @JsonProperty("cond") Integer condition) {
    }
}
