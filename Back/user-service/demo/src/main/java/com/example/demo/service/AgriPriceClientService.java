package com.example.demo.service;

import java.net.URI;
import java.text.Collator;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.example.demo.config.AgriPriceProperties;
import com.example.demo.dto.res.AgriPriceLatestQuoteRes;
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
    private static final ZoneId BANGKOK = ZoneId.of("Asia/Bangkok");
    private static final List<String> FALLBACK_COMMODs = List.of(
            "กระบือ", "กุ้ง", "ไก่เนื้อ", "ข้าว", "ข้าวโพดเลี้ยงสัตว์", "ไข่เป็ด", "ไข่ไก่",
            "โคเนื้อ", "เงาะ", "ทุเรียน", "ปาล์มน้ำมัน", "พริกไทย", "มะพร้าว", "มันสำปะหลัง",
            "ยางพารา", "ลำไย", "สับปะรด", "สุกร");

    private final AgriPriceProperties props;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private volatile List<String> cachedProductNames = List.of();
    private volatile Instant productNamesCachedAt = Instant.EPOCH;
    private volatile List<String> cachedCategories = List.of();
    private volatile Instant categoriesCachedAt = Instant.EPOCH;
    private volatile List<String> cachedDailyProductNames = List.of();
    private volatile List<String> cachedPeriodProductNames = List.of();
    private volatile List<String> cachedCommods = List.of();

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

    /**
     * ชื่อสินค้าที่ตรงหรือมีคำค้นอยู่ข้างใน — ถ้าพิมพ์ไม่ครบสโคปจะได้ทุกรายการที่เจอ
     */
    public List<String> findMatchingProductNames(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim().replaceAll("\\s+", " ");
        if (query.isEmpty()) {
            return List.of();
        }
        List<String> names = loadMatchNamesSafe();
        if (names.isEmpty()) {
            return List.of();
        }
        List<String> contains = names.stream().filter(name -> name.contains(query)).toList();
        if (!contains.isEmpty()) {
            return contains;
        }
        String token = firstToken(query);
        if (!token.equals(query)) {
            return names.stream().filter(name -> name.contains(token)).toList();
        }
        return List.of();
    }

    public AgriPriceSearchRes searchExactProduct(String productName) {
        String name = productName == null ? "" : productName.trim();
        if (name.isEmpty()) {
            return new AgriPriceSearchRes("daily", "none", productName, 0, List.of());
        }
        return search(name, "auto");
    }

    public AgriPriceLatestQuoteRes latestAverage(List<AgriPriceRowRes> rows, String fallbackName) {
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        String latestDate = rows.stream()
                .map(AgriPriceRowRes::dateKey)
                .filter(date -> date != null && !date.isBlank())
                .max(String::compareTo)
                .orElse(null);
        if (latestDate == null) {
            return null;
        }
        List<AgriPriceRowRes> latest = rows.stream()
                .filter(row -> latestDate.equals(row.dateKey()) && row.price() != null)
                .toList();
        if (latest.isEmpty()) {
            return null;
        }
        double average = latest.stream().mapToDouble(AgriPriceRowRes::price).average().orElse(Double.NaN);
        if (Double.isNaN(average)) {
            return null;
        }
        String unit = latest.stream()
                .map(AgriPriceRowRes::unit)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
        String productName = latest.stream()
                .map(AgriPriceRowRes::productName)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(fallbackName);
        return new AgriPriceLatestQuoteRes(productName, latestDate, average, unit, latest.size());
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
            case "auto" -> searchAuto(query);
            default -> searchDaily(query);
        };
    }

    private AgriPriceSearchRes searchAuto(String query) {
        AgriPriceSearchRes daily = searchQuiet(() -> searchDaily(query));
        if (hasItems(daily)) {
            return daily;
        }
        AgriPriceSearchRes weekly = searchQuiet(() ->
                searchPeriod(query, "weekly", "/api/weekly-prices/product", "/api/weekly-prices/commod"));
        if (hasItems(weekly)) {
            return weekly;
        }
        AgriPriceSearchRes monthly = searchQuiet(() ->
                searchPeriod(query, "monthly", "/api/monthly-prices/product", "/api/monthly-prices/commod"));
        if (hasItems(monthly)) {
            return monthly;
        }
        return new AgriPriceSearchRes("daily", "none", query, 0, List.of());
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
        String productMatch = resolvePeriodProductName(query);
        if (productMatch != null) {
            FetchedPage<NabcPeriodPrice> byResolved = fetchPeriodPages(productPath, Map.of("product_name", productMatch));
            if (!byResolved.items.isEmpty()) {
                return toPeriodResult(period, "product", productMatch, byResolved);
            }
        }

        String commodMatch = resolveCommod(query);
        if (commodMatch != null) {
            FetchedPage<NabcPeriodPrice> byResolvedCommod = fetchPeriodPages(commodPath, Map.of("commod", commodMatch));
            if (!byResolvedCommod.items.isEmpty()) {
                return toPeriodResult(period, "commod", commodMatch, byResolvedCommod);
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
                    : yearTh + "-" + month + "-W" + String.format("%02d", week == null ? 0 : week);
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

        List<String> dailyProducts = List.of();
        try {
            JsonNode root = getJson("/api/daily-prices/product-names", Map.of());
            dailyProducts = readStringList(root.path("data"));
        } catch (RuntimeException ex) {
            log.warn("Could not load daily agri product names: {}", ex.getMessage());
            dailyProducts = cachedDailyProductNames;
        }

        List<String> dailyCategories = loadCategoriesSafe();
        PeriodCatalog periodCatalog = loadPeriodCatalogSafe();

        Set<String> types = new LinkedHashSet<>();
        dailyCategories.forEach(name -> addUnique(types, name));
        periodCatalog.commods().forEach(name -> addUnique(types, name));
        if (types.isEmpty()) {
            FALLBACK_COMMODs.forEach(name -> addUnique(types, name));
        }

        cachedDailyProductNames = List.copyOf(dailyProducts);
        cachedPeriodProductNames = List.copyOf(periodCatalog.products());
        cachedCommods = List.copyOf(periodCatalog.commods());
        cachedProductNames = List.copyOf(sortThai(types));
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
        return resolveUniqueName(loadDailyProductNamesSafe(), query);
    }

    private String resolvePeriodProductName(String query) {
        return resolveUniqueName(loadPeriodProductNamesSafe(), query);
    }

    private String resolveCommod(String query) {
        List<String> commods = loadCommodsSafe();
        for (String name : commods) {
            if (name.equals(query) || query.startsWith(name + " ")) {
                return name;
            }
        }
        String token = firstToken(query);
        for (String name : commods) {
            if (name.equals(token)) {
                return name;
            }
        }
        return null;
    }

    private static String resolveUniqueName(List<String> names, String query) {
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

    private List<String> loadDailyProductNamesSafe() {
        loadProductNamesSafe();
        return cachedDailyProductNames;
    }

    private List<String> loadPeriodProductNamesSafe() {
        loadProductNamesSafe();
        return cachedPeriodProductNames;
    }

    private List<String> loadCommodsSafe() {
        loadProductNamesSafe();
        return cachedCommods.isEmpty() ? FALLBACK_COMMODs : cachedCommods;
    }

    private List<String> loadMatchNamesSafe() {
        loadProductNamesSafe();
        Set<String> names = new LinkedHashSet<>(cachedProductNames);
        cachedDailyProductNames.forEach(name -> addUnique(names, name));
        cachedPeriodProductNames.forEach(name -> addUnique(names, name));
        return List.copyOf(names);
    }

    private PeriodCatalog loadPeriodCatalogSafe() {
        YearMonth cursor = YearMonth.now(BANGKOK);
        for (int i = 0; i < 4; i++) {
            PeriodCatalog monthly = fetchPeriodCatalog("/api/monthly-prices/year-month", cursor.minusMonths(i));
            if (!monthly.isEmpty()) {
                return monthly;
            }
        }
        for (int i = 0; i < 4; i++) {
            PeriodCatalog weekly = fetchPeriodCatalog("/api/weekly-prices/year-month", cursor.minusMonths(i));
            if (!weekly.isEmpty()) {
                return weekly;
            }
        }
        return new PeriodCatalog(FALLBACK_COMMODs, List.of());
    }

    private PeriodCatalog fetchPeriodCatalog(String path, YearMonth target) {
        try {
            JsonNode root = getJson(path, Map.of(
                    "year_th", String.valueOf(target.getYear() + 543),
                    "month", String.format("%02d", target.getMonthValue()),
                    "page", "1"));
            List<NabcPeriodPrice> items = readList(root.path("data"), NabcPeriodPrice.class);
            Set<String> commods = new LinkedHashSet<>();
            Set<String> products = new LinkedHashSet<>();
            for (NabcPeriodPrice item : items) {
                addUnique(commods, item.commod());
                addUnique(products, item.productName());
            }
            return new PeriodCatalog(List.copyOf(commods), List.copyOf(products));
        } catch (RuntimeException ex) {
            log.warn("Could not load agri period catalog {}: {}", path, ex.getMessage());
            return new PeriodCatalog(List.of(), List.of());
        }
    }

    private AgriPriceSearchRes searchQuiet(java.util.function.Supplier<AgriPriceSearchRes> supplier) {
        try {
            AgriPriceSearchRes result = supplier.get();
            return result == null ? new AgriPriceSearchRes("daily", "none", "", 0, List.of()) : result;
        } catch (RuntimeException ex) {
            log.warn("Agri price search step failed: {}", ex.getMessage());
            return new AgriPriceSearchRes("daily", "none", "", 0, List.of());
        }
    }

    private static boolean hasItems(AgriPriceSearchRes result) {
        return result != null && result.items() != null && !result.items().isEmpty();
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
            return "auto";
        }
        String period = rawPeriod.trim().toLowerCase(Locale.ROOT);
        if (period.equals("auto") || period.equals("weekly") || period.equals("monthly") || period.equals("daily")) {
            return period;
        }
        throw new ApiException(ErrorCode.VALIDATION_ERROR, "period must be auto, daily, weekly, or monthly");
    }

    private static List<String> sortThai(Collection<String> names) {
        Collator collator = Collator.getInstance(Locale.forLanguageTag("th-TH"));
        return names.stream().sorted(collator).toList();
    }

    private static void addUnique(Set<String> into, String value) {
        if (value != null && !value.isBlank()) {
            into.add(value.trim());
        }
    }

    private record PeriodCatalog(List<String> commods, List<String> products) {
        boolean isEmpty() {
            return commods.isEmpty() && products.isEmpty();
        }
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
