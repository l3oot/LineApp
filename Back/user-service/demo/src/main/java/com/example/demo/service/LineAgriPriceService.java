package com.example.demo.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.demo.dto.res.AgriPriceLatestQuoteRes;
import com.example.demo.dto.res.AgriPriceSearchRes;
import com.example.demo.dto.res.AiAgriPriceBriefRes;
import com.example.demo.dto.res.AiAgriPriceMatchRes;
import com.example.demo.util.AiLatency;

@Service
public class LineAgriPriceService {

    private static final Logger log = LoggerFactory.getLogger(LineAgriPriceService.class);
    static final String ASK_NAME_REPLY = "บอกชื่อสินค้ามาได้เลยจ้า เช่น ราคามะนาว";
    static final String NOT_FOUND_REPLY = "ตอนนี้ยังไม่สินค้านี้จ้า";
    private static final String FALLBACK_REPLY = "🥬 ยายยังดึงราคาไม่ได้ตอนนี้ ลองพิมพ์ ราคามะนาว อีกครั้งนะจ๊ะ";
    private static final int MATCH_LIMIT = 8;
    private static final int AI_CATALOG_LIMIT = 300;
    private static final Duration PRICE_CACHE_TTL = Duration.ofMinutes(15);
    private static final Pattern HAS_DIGIT = Pattern.compile("\\d");
    private static final Pattern TRANSACTION_VERB = Pattern.compile("ซื้อ|ขาย|จ่าย|ได้|รับ");

    private final AgriPriceClientService agriPriceClientService;
    private final AiClientService aiClientService;
    private final ConcurrentHashMap<String, CacheEntry<List<String>>> matchCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CacheEntry<AgriPriceLatestQuoteRes>> quoteCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CacheEntry<String>> summaryCache = new ConcurrentHashMap<>();

    public LineAgriPriceService(
            AgriPriceClientService agriPriceClientService,
            AiClientService aiClientService) {
        this.agriPriceClientService = agriPriceClientService;
        this.aiClientService = aiClientService;
    }

    /**
     * ตอบคำถามราคา — คืน null ถ้าข้อความเป็นบันทึกรายการ ไม่ใช่คำถามราคา
     */
    public String tryBuildReply(String userText) {
        long t0 = System.currentTimeMillis();
        String reqId = AiLatency.currentOrDash();
        String text = userText == null ? "" : userText.trim();
        if (text.isEmpty() || !text.contains("ราคา")) {
            return null;
        }
        if (looksLikeTransaction(text)) {
            return null;
        }

        String productQuery = stripPriceWords(text);
        if (productQuery == null) {
            return ASK_NAME_REPLY;
        }

        long tMatch0 = System.currentTimeMillis();
        List<String> matches = agriPriceClientService.findMatchingProductNames(productQuery);
        String matchSource = matches.isEmpty() ? "none" : "local";
        long localMatchMs = System.currentTimeMillis() - tMatch0;

        long catalogMs = 0;
        long aiMatchMs = 0;
        int llmCalls = 0;
        if (matches.isEmpty()) {
            long tCatalog0 = System.currentTimeMillis();
            List<String> catalog = catalogForAi();
            catalogMs = System.currentTimeMillis() - tCatalog0;
            long tAiMatch0 = System.currentTimeMillis();
            List<String> cachedMatch = getFresh(matchCache, productQuery);
            if (cachedMatch != null) {
                matches = cachedMatch;
                matchSource = "ai-cache";
                log.info("[ai-latency] hop=user reqId={} action=price-match cache=hit query={}",
                        reqId, productQuery);
            } else {
                matches = mapWithAi(productQuery, catalog);
                if (!matches.isEmpty()) {
                    putCache(matchCache, productQuery, matches);
                    matchSource = "ai";
                    llmCalls += 1;
                }
            }
            aiMatchMs = System.currentTimeMillis() - tAiMatch0;
        }
        if (matches.isEmpty()) {
            log.info(
                    "[ai-latency] hop=user reqId={} action=price-breakdown query={} matchSource={} "
                            + "extractMs=0 skippedExtract=true localMatchMs={} catalogMs={} aiMatchMs={} "
                            + "quotesMs=0 summarizeMs=0 llmCalls={} totalMs={}",
                    reqId, productQuery, matchSource, localMatchMs, catalogMs, aiMatchMs,
                    llmCalls, System.currentTimeMillis() - t0);
            return NOT_FOUND_REPLY;
        }

        List<String> toFetch = selectProducts(productQuery, matches);
        long tQuotes0 = System.currentTimeMillis();
        List<AgriPriceLatestQuoteRes> quotes = fetchQuotes(toFetch);
        long quotesMs = System.currentTimeMillis() - tQuotes0;
        if (quotes.isEmpty()) {
            log.info(
                    "[ai-latency] hop=user reqId={} action=price-breakdown query={} matchSource={} "
                            + "extractMs=0 skippedExtract=true localMatchMs={} catalogMs={} aiMatchMs={} "
                            + "quotesMs={} summarizeMs=0 llmCalls={} totalMs={}",
                    reqId, productQuery, matchSource, localMatchMs, catalogMs, aiMatchMs,
                    quotesMs, llmCalls, System.currentTimeMillis() - t0);
            return FALLBACK_REPLY;
        }

        long tSum0 = System.currentTimeMillis();
        String cachedSummary = getFresh(summaryCache, summaryKey(productQuery, quotes));
        String summary;
        long summarizeMs;
        if (cachedSummary != null) {
            summary = cachedSummary;
            summarizeMs = System.currentTimeMillis() - tSum0;
            log.info("[ai-latency] hop=user reqId={} action=price-summarize cache=hit query={}", reqId, productQuery);
        } else {
            AiAgriPriceBriefRes ai = aiClientService.summarizeAgriPrice(productQuery, quotes);
            summarizeMs = System.currentTimeMillis() - tSum0;
            if (ai != null && ai.summary() != null && !ai.summary().isBlank()) {
                summary = ai.summary().trim();
                llmCalls += 1;
                putCache(summaryCache, summaryKey(productQuery, quotes), summary);
            } else {
                summary = fallbackSummary(quotes);
            }
        }
        log.info(
                "[ai-latency] hop=user reqId={} action=price-breakdown query={} matchSource={} products={} "
                        + "extractMs=0 skippedExtract=true localMatchMs={} catalogMs={} aiMatchMs={} "
                        + "quotesMs={} summarizeMs={} llmCalls={} totalMs={}",
                reqId, productQuery, matchSource, toFetch, localMatchMs, catalogMs, aiMatchMs,
                quotesMs, summarizeMs, llmCalls, System.currentTimeMillis() - t0);
        return summary;
    }

    private List<AgriPriceLatestQuoteRes> fetchQuotes(List<String> productNames) {
        List<CompletableFuture<AgriPriceLatestQuoteRes>> futures = productNames.stream()
                .map(name -> CompletableFuture.supplyAsync(() -> {
                    AgriPriceLatestQuoteRes cached = getFresh(quoteCache, name);
                    if (cached != null) {
                        return cached;
                    }
                    try {
                        AgriPriceSearchRes search = agriPriceClientService.searchExactProduct(name);
                        AgriPriceLatestQuoteRes quote = agriPriceClientService.latestAverage(search.items(), name);
                        if (quote != null) {
                            putCache(quoteCache, name, quote);
                        }
                        return quote;
                    } catch (Exception e) {
                        log.warn("[line-price] fetch failed product={}: {}", name, e.getMessage());
                        return null;
                    }
                }))
                .toList();
        List<AgriPriceLatestQuoteRes> quotes = new ArrayList<>();
        for (CompletableFuture<AgriPriceLatestQuoteRes> future : futures) {
            AgriPriceLatestQuoteRes quote = future.join();
            if (quote != null) {
                quotes.add(quote);
            }
        }
        quotes.sort(Comparator.comparing(AgriPriceLatestQuoteRes::productName, String::compareTo));
        return quotes;
    }

    private List<String> mapWithAi(String productQuery, List<String> catalog) {
        if (catalog.isEmpty()) {
            return List.of();
        }
        List<String> promptCatalog = catalog.size() <= AI_CATALOG_LIMIT
                ? catalog
                : catalog.subList(0, AI_CATALOG_LIMIT);
        AiAgriPriceMatchRes mapped = aiClientService.matchAgriProduct(productQuery, promptCatalog);
        if (mapped == null) {
            return List.of();
        }
        List<String> resolved = resolveMatchedNames(mapped.matchedNames(), catalog);
        if (!resolved.isEmpty()) {
            log.info("[line-price] ai-mapped query={} -> {}", productQuery, resolved);
        }
        return resolved;
    }

    private List<String> catalogForAi() {
        Set<String> names = new LinkedHashSet<>();
        agriPriceClientService.listProductNames().forEach(name -> addUnique(names, name));
        agriPriceClientService.listMatchNames().forEach(name -> addUnique(names, name));
        return List.copyOf(names);
    }

    static List<String> resolveMatchedNames(List<String> aiNames, List<String> catalog) {
        if (aiNames == null || catalog == null || catalog.isEmpty()) {
            return List.of();
        }
        Set<String> allowed = new LinkedHashSet<>(catalog);
        Set<String> resolved = new LinkedHashSet<>();
        for (String raw : aiNames) {
            if (raw == null) {
                continue;
            }
            String name = raw.trim();
            if (name.isEmpty()) {
                continue;
            }
            if (allowed.contains(name)) {
                resolved.add(name);
            } else {
                for (String candidate : catalog) {
                    if (candidate.startsWith(name) || name.startsWith(candidate)) {
                        resolved.add(candidate);
                    }
                    if (resolved.size() >= MATCH_LIMIT) {
                        break;
                    }
                }
            }
            if (resolved.size() >= MATCH_LIMIT) {
                break;
            }
        }
        if (resolved.size() <= MATCH_LIMIT) {
            return List.copyOf(resolved);
        }
        return resolved.stream().limit(MATCH_LIMIT).toList();
    }

    private static void addUnique(Set<String> into, String value) {
        if (value != null && !value.isBlank()) {
            into.add(value.trim());
        }
    }

    static List<String> selectProducts(String query, List<String> matches) {
        List<String> exact = matches.stream().filter(name -> name.equals(query)).toList();
        List<String> chosen = exact.isEmpty() ? matches : exact;
        if (chosen.size() <= MATCH_LIMIT) {
            return chosen;
        }
        return chosen.subList(0, MATCH_LIMIT);
    }

    static boolean looksLikeTransaction(String text) {
        return HAS_DIGIT.matcher(text).find() && TRANSACTION_VERB.matcher(text).find();
    }

    static String stripPriceWords(String text) {
        String stripped = text
                .replace("ราคา", " ")
                .replace("เท่าไหร่", " ")
                .replace("เท่าไร", " ")
                .replace("กี่บาท", " ")
                .replace("วันนี้", " ")
                .replace("ล่าสุด", " ")
                .replace("ขอดู", " ")
                .replace("หน่อย", " ")
                .replace("สินค้า", " ")
                .replace("จ้า", " ")
                .replace("จ๋า", " ")
                .replace("ค่ะ", " ")
                .replace("คะ", " ")
                .replace("ครับ", " ")
                .replace("นะ", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return stripped.isEmpty() ? null : stripped;
    }

    static String fallbackSummary(List<AgriPriceLatestQuoteRes> quotes) {
        StringBuilder sb = new StringBuilder("🥬 ราคาเฉลี่ยล่าสุด");
        for (AgriPriceLatestQuoteRes quote : quotes) {
            sb.append('\n')
                    .append(quote.productName())
                    .append(' ')
                    .append(formatPrice(quote.averagePrice()))
                    .append(' ')
                    .append(quote.unit() == null || quote.unit().isBlank() ? "บาท" : quote.unit())
                    .append(" (")
                    .append(quote.dateKey())
                    .append(')');
        }
        return sb.toString();
    }

    static String formatPrice(double value) {
        String formatted = String.format(Locale.US, "%.2f", value);
        if (formatted.endsWith(".00")) {
            return formatted.substring(0, formatted.length() - 3);
        }
        if (formatted.endsWith("0") && formatted.contains(".")) {
            return formatted.substring(0, formatted.length() - 1);
        }
        return formatted;
    }

    private static String summaryKey(String productQuery, List<AgriPriceLatestQuoteRes> quotes) {
        StringBuilder sb = new StringBuilder(productQuery == null ? "" : productQuery);
        for (AgriPriceLatestQuoteRes quote : quotes) {
            sb.append('|')
                    .append(quote.productName())
                    .append(':')
                    .append(quote.dateKey())
                    .append(':')
                    .append(quote.averagePrice());
        }
        return sb.toString();
    }

    private static <T> T getFresh(ConcurrentHashMap<String, CacheEntry<T>> cache, String key) {
        CacheEntry<T> entry = cache.get(key);
        if (entry == null) {
            return null;
        }
        if (!entry.fresh()) {
            cache.remove(key, entry);
            return null;
        }
        return entry.value();
    }

    private static <T> void putCache(ConcurrentHashMap<String, CacheEntry<T>> cache, String key, T value) {
        cache.put(key, new CacheEntry<>(value, System.currentTimeMillis() + PRICE_CACHE_TTL.toMillis()));
    }

    private record CacheEntry<T>(T value, long expiresAtMs) {
        boolean fresh() {
            return System.currentTimeMillis() < expiresAtMs;
        }
    }
}
