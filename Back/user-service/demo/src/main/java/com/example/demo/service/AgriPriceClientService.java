package com.example.demo.service;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.example.demo.config.AgriPriceProperties;
import com.example.demo.dto.res.AgriPriceRowRes;
import com.example.demo.dto.res.AgriPriceSearchRes;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.CollectionType;

@Service
public class AgriPriceClientService {

    private static final Logger log = LoggerFactory.getLogger(AgriPriceClientService.class);
    private static final Duration PRODUCT_CACHE_TTL = Duration.ofHours(1);

    private final AgriPriceProperties props;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private volatile List<String> cachedProductNames = List.of();
    private volatile Instant productNamesCachedAt = Instant.EPOCH;
    private volatile List<String> cachedCategories = List.of();
    private volatile Instant categoriesCachedAt = Instant.EPOCH;

    public AgriPriceClientService(AgriPriceProperties props) {
        this.props = props;
        this.objectMapper = new ObjectMapper();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int millis = (int) Duration.ofSeconds(Math.max(props.getTimeoutSeconds(), 5)).toMillis();
        factory.setConnectTimeout(millis);
        factory.setReadTimeout(millis);
        this.restTemplate = new RestTemplate(factory);
    }

    public List<String> listProductNames() {
        return loadProductNames();
    }

    public AgriPriceSearchRes search(String rawQuery, String rawPeriod) {
        String query = rawQuery == null ? "" : rawQuery.trim().replaceAll("\\s+", " ");
        if (query.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "q is required");
        }
        String period = normalizePeriod(rawPeriod);

        return switch (period) {
            case "weekly" -> searchPeriod(query, period, "/api/weekly-prices/product", "/api/weekly-prices/commod");
            case "monthly" -> searchPeriod(query, period, "/api/monthly-prices/product", "/api/monthly-prices/commod");
            default -> searchDaily(query);
        };
    }

    private AgriPriceSearchRes searchDaily(String query) {
        String productMatch = resolveProductName(query);
        if (productMatch != null) {
            FetchedPage<NabcDailyPrice> page = fetchDailyPages("/api/daily-prices/product", Map.of("product_name", productMatch));
            if (!page.items.isEmpty()) {
                return toDailyResult("daily", "product", productMatch, page);
            }
        }

        String categoryMatch = resolveCategory(query);
        if (categoryMatch != null) {
            FetchedPage<NabcDailyPrice> page = fetchDailyPages(
                    "/api/daily-prices/category",
                    Map.of("product_category", categoryMatch));
            if (!page.items.isEmpty()) {
                return toDailyResult("daily", "category", categoryMatch, page);
            }
        }

        FetchedPage<NabcDailyPrice> byProduct = fetchDailyPages("/api/daily-prices/product", Map.of("product_name", query));
        if (!byProduct.items.isEmpty()) {
            return toDailyResult("daily", "product", query, byProduct);
        }

        FetchedPage<NabcDailyPrice> byCategory = fetchDailyPages(
                "/api/daily-prices/category",
                Map.of("product_category", firstToken(query)));
        if (!byCategory.items.isEmpty()) {
            return toDailyResult("daily", "category", firstToken(query), byCategory);
        }

        return new AgriPriceSearchRes("daily", "none", query, 0, List.of());
    }

    private AgriPriceSearchRes searchPeriod(String query, String period, String productPath, String commodPath) {
        String productMatch = resolveProductName(query);
        if (productMatch != null) {
            FetchedPage<NabcPeriodPrice> byResolved = fetchPeriodPages(productPath, Map.of("product_name", productMatch));
            if (!byResolved.items.isEmpty()) {
                return toPeriodResult(period, "product", productMatch, byResolved);
            }
        }

        FetchedPage<NabcPeriodPrice> byProduct = fetchPeriodPages(productPath, Map.of("product_name", query));
        if (!byProduct.items.isEmpty()) {
            return toPeriodResult(period, "product", query, byProduct);
        }

        FetchedPage<NabcPeriodPrice> byCommod = fetchPeriodPages(commodPath, Map.of("commod", query));
        if (!byCommod.items.isEmpty()) {
            return toPeriodResult(period, "commod", query, byCommod);
        }

        String token = firstToken(query);
        if (!token.equals(query)) {
            FetchedPage<NabcPeriodPrice> byToken = fetchPeriodPages(commodPath, Map.of("commod", token));
            if (!byToken.items.isEmpty()) {
                return toPeriodResult(period, "commod", token, byToken);
            }
        }

        return new AgriPriceSearchRes(period, "none", query, 0, List.of());
    }

    private AgriPriceSearchRes toDailyResult(String period, String matchedBy, String matchedName, FetchedPage<NabcDailyPrice> page) {
        List<AgriPriceRowRes> rows = new ArrayList<>();
        for (NabcDailyPrice item : page.items) {
            Double price = toDouble(item.dayPrice());
            if (price == null || isBlank(item.dataDate())) {
                continue;
            }
            rows.add(new AgriPriceRowRes(
                    item.dataDate(),
                    price,
                    blankToNull(item.unit()),
                    blankToNull(item.productName()),
                    blankToNull(item.marketName()),
                    blankToNull(item.province()),
                    toInt(item.yearTh()),
                    blankToNull(item.month()),
                    null));
        }
        return new AgriPriceSearchRes(period, matchedBy, matchedName, page.total, rows);
    }

    private AgriPriceSearchRes toPeriodResult(String period, String matchedBy, String matchedName, FetchedPage<NabcPeriodPrice> page) {
        List<AgriPriceRowRes> rows = new ArrayList<>();
        for (NabcPeriodPrice item : page.items) {
            Double price = toDouble(item.value());
            Integer yearTh = toInt(item.yearTh());
            String month = padMonth(item.month());
            if (price == null || yearTh == null || month == null) {
                continue;
            }
            Integer week = toInt(item.week());
            String dateKey = "monthly".equals(period)
                    ? yearTh + "-" + month
                    : yearTh + "-" + month + "-W" + (week == null ? 0 : week);
            rows.add(new AgriPriceRowRes(
                    dateKey,
                    price,
                    blankToNull(item.unit()),
                    blankToNull(item.productName()),
                    null,
                    blankToNull(item.provinceName()),
                    yearTh,
                    month,
                    week));
        }
        return new AgriPriceSearchRes(period, matchedBy, matchedName, page.total, rows);
    }

    private FetchedPage<NabcDailyPrice> fetchDailyPages(String path, Map<String, String> query) {
        return fetchPages(path, query, NabcDailyPrice.class);
    }

    private FetchedPage<NabcPeriodPrice> fetchPeriodPages(String path, Map<String, String> query) {
        return fetchPages(path, query, NabcPeriodPrice.class);
    }

    private <T> FetchedPage<T> fetchPages(String path, Map<String, String> query, Class<T> type) {
        List<T> all = new ArrayList<>();
        int total = 0;
        int maxPages = Math.max(props.getMaxPages(), 1);
        for (int page = 1; page <= maxPages; page++) {
            JsonNode root = getJson(path, withPage(query, page));
            List<T> chunk = readList(root.path("data"), type);
            JsonNode pagination = root.path("pagination");
            total = pagination.path("total").asInt(Math.max(total, chunk.size()));
            all.addAll(chunk);
            if (chunk.isEmpty() || all.size() >= total) {
                break;
            }
        }
        return new FetchedPage<>(all, total);
    }

    private List<String> loadProductNames() {
        if (!cachedProductNames.isEmpty() && Instant.now().isBefore(productNamesCachedAt.plus(PRODUCT_CACHE_TTL))) {
            return cachedProductNames;
        }
        JsonNode root = getJson("/api/daily-prices/product-names", Map.of());
        List<String> names = readStringList(root.path("data"));
        cachedProductNames = List.copyOf(names);
        productNamesCachedAt = Instant.now();
        return cachedProductNames;
    }

    private List<String> loadCategories() {
        if (!cachedCategories.isEmpty() && Instant.now().isBefore(categoriesCachedAt.plus(PRODUCT_CACHE_TTL))) {
            return cachedCategories;
        }
        JsonNode root = getJson("/api/daily-prices/categories", Map.of());
        List<String> names = readStringList(root.path("data"));
        cachedCategories = List.copyOf(names);
        categoriesCachedAt = Instant.now();
        return cachedCategories;
    }

    private List<String> loadProductNamesSafe() {
        try {
            return loadProductNames();
        } catch (RuntimeException ex) {
            log.warn("Could not load agri product names: {}", ex.getMessage());
            return cachedProductNames;
        }
    }

    private List<String> loadCategoriesSafe() {
        try {
            return loadCategories();
        } catch (RuntimeException ex) {
            log.warn("Could not load agri product categories: {}", ex.getMessage());
            return cachedCategories;
        }
    }

    private String resolveProductName(String query) {
        List<String> names = loadProductNamesSafe();
        for (String name : names) {
            if (name.equals(query)) {
                return name;
            }
        }
        List<String> contains = names.stream().filter(name -> name.contains(query)).toList();
        if (contains.size() == 1) {
            return contains.get(0);
        }
        List<String> starts = names.stream().filter(name -> name.startsWith(query)).toList();
        if (starts.size() == 1) {
            return starts.get(0);
        }
        return null;
    }

    private String resolveCategory(String query) {
        List<String> categories = loadCategoriesSafe();
        for (String name : categories) {
            if (name.equals(query) || query.startsWith(name)) {
                return name;
            }
        }
        String token = firstToken(query);
        for (String name : categories) {
            if (name.equals(token)) {
                return name;
            }
        }
        return null;
    }

    private JsonNode getJson(String path, Map<String, String> query) {
        URI uri = buildUri(path, query);
        try {
            String body = restTemplate.getForObject(uri, String.class);
            if (body == null || body.isBlank()) {
                throw new ApiException(ErrorCode.AGRI_PRICE_API_ERROR, "Empty response from agri price API");
            }
            JsonNode root = objectMapper.readTree(body);
            if (root.has("success") && root.path("success").isBoolean() && !root.path("success").asBoolean()) {
                String message = root.path("message").asText("Agri price API request failed");
                throw new ApiException(ErrorCode.AGRI_PRICE_API_ERROR, message);
            }
            return root;
        } catch (ApiException ex) {
            throw ex;
        } catch (RestClientException | java.io.IOException ex) {
            log.warn("Agri price API request failed: {} {}", uri, ex.getMessage());
            throw new ApiException(ErrorCode.AGRI_PRICE_API_ERROR, "Agri price API request failed");
        }
    }

    private URI buildUri(String path, Map<String, String> query) {
        String base = props.getBaseUrl() == null ? "https://agriapi.nabc.go.th" : props.getBaseUrl().trim();
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

    private Map<String, String> withPage(Map<String, String> query, int page) {
        Map<String, String> next = new LinkedHashMap<>(query);
        next.put("page", String.valueOf(page));
        return next;
    }

    private <T> List<T> readList(JsonNode node, Class<T> type) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return List.of();
        }
        CollectionType listType = objectMapper.getTypeFactory().constructCollectionType(List.class, type);
        if (node.isArray()) {
            return objectMapper.convertValue(node, listType);
        }
        if (node.isObject()) {
            T one = objectMapper.convertValue(node, type);
            return one == null ? List.of() : List.of(one);
        }
        return List.of();
    }

    private List<String> readStringList(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return List.of();
        }
        if (node.isArray()) {
            List<String> out = new ArrayList<>();
            node.forEach(item -> {
                if (item.isTextual() && !item.asText().isBlank()) {
                    out.add(item.asText().trim());
                }
            });
            return out;
        }
        if (node.isTextual() && !node.asText().isBlank()) {
            return List.of(node.asText().trim());
        }
        return List.of();
    }

    private static String normalizePeriod(String rawPeriod) {
        if (rawPeriod == null || rawPeriod.isBlank()) {
            return "daily";
        }
        String period = rawPeriod.trim().toLowerCase(Locale.ROOT);
        if (period.equals("weekly") || period.equals("monthly") || period.equals("daily")) {
            return period;
        }
        throw new ApiException(ErrorCode.VALIDATION_ERROR, "period must be daily, weekly, or monthly");
    }

    private static String firstToken(String query) {
        int space = query.indexOf(' ');
        return space < 0 ? query : query.substring(0, space);
    }

    private static String padMonth(String month) {
        if (month == null || month.isBlank()) {
            return null;
        }
        String trimmed = month.trim();
        return trimmed.length() == 1 ? "0" + trimmed : trimmed;
    }

    private static Double toDouble(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        if (node.isNumber()) {
            return node.asDouble();
        }
        String text = node.asText("").replace(",", "").trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(text);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static Integer toInt(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        if (node.isNumber()) {
            return node.asInt();
        }
        String text = node.asText("").trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private record FetchedPage<T>(List<T> items, int total) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NabcDailyPrice(
            @JsonProperty("data_date") String dataDate,
            @JsonProperty("month") String month,
            @JsonProperty("year_th") JsonNode yearTh,
            @JsonProperty("product_category") String productCategory,
            @JsonProperty("product_name") String productName,
            @JsonProperty("market_name") String marketName,
            @JsonProperty("province") String province,
            @JsonProperty("day_price") JsonNode dayPrice,
            @JsonProperty("unit") String unit) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NabcPeriodPrice(
            @JsonProperty("year_th") JsonNode yearTh,
            @JsonProperty("month") String month,
            @JsonProperty("week") JsonNode week,
            @JsonProperty("province_name") String provinceName,
            @JsonProperty("product_name") String productName,
            @JsonProperty("commod") String commod,
            @JsonProperty("value") JsonNode value,
            @JsonProperty("unit") String unit) {
    }
}
