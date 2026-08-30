package com.example.demo.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.demo.dto.res.AgriPriceLatestQuoteRes;
import com.example.demo.dto.res.AgriPriceSearchRes;
import com.example.demo.dto.res.AiAgriPriceBriefRes;
import com.example.demo.dto.res.AiAgriPriceExtractRes;

@Service
public class LineAgriPriceService {

    private static final Logger log = LoggerFactory.getLogger(LineAgriPriceService.class);
    static final String ASK_NAME_REPLY = "บอกชื่อสินค้ามาได้เลยจ้า เช่น ราคามะนาว";
    static final String NOT_FOUND_REPLY = "ตอนนี้ยังไม่สินค้านี้จ้า";
    private static final String FALLBACK_REPLY = "🥬 ยายยังดึงราคาไม่ได้ตอนนี้ ลองพิมพ์ ราคามะนาว อีกครั้งนะจ๊ะ";
    private static final int MATCH_LIMIT = 8;
    private static final Pattern HAS_DIGIT = Pattern.compile("\\d");
    private static final Pattern TRANSACTION_VERB = Pattern.compile("ซื้อ|ขาย|จ่าย|ได้|รับ");

    private final AgriPriceClientService agriPriceClientService;
    private final AiClientService aiClientService;

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
        String text = userText == null ? "" : userText.trim();
        if (text.isEmpty() || !text.contains("ราคา")) {
            return null;
        }

        AiAgriPriceExtractRes extracted = aiClientService.extractAgriPriceQuery(text);
        boolean isPriceQuestion;
        String productQuery;
        if (extracted == null) {
            if (looksLikeTransaction(text)) {
                return null;
            }
            isPriceQuestion = true;
            productQuery = stripPriceWords(text);
        } else {
            isPriceQuestion = extracted.isPriceQuestion() == null
                    ? !looksLikeTransaction(text)
                    : extracted.isPriceQuestion();
            productQuery = blankToNull(extracted.productQuery());
            if (productQuery == null) {
                productQuery = stripPriceWords(text);
            }
        }

        if (!isPriceQuestion) {
            return null;
        }
        if (productQuery == null) {
            return ASK_NAME_REPLY;
        }

        List<String> matches = agriPriceClientService.findMatchingProductNames(productQuery);
        if (matches.isEmpty()) {
            return NOT_FOUND_REPLY;
        }

        List<String> toFetch = selectProducts(productQuery, matches);
        List<AgriPriceLatestQuoteRes> quotes = fetchQuotes(toFetch);
        if (quotes.isEmpty()) {
            return FALLBACK_REPLY;
        }

        AiAgriPriceBriefRes ai = aiClientService.summarizeAgriPrice(productQuery, quotes);
        if (ai != null && ai.summary() != null && !ai.summary().isBlank()) {
            return ai.summary().trim();
        }
        return fallbackSummary(quotes);
    }

    private List<AgriPriceLatestQuoteRes> fetchQuotes(List<String> productNames) {
        List<CompletableFuture<AgriPriceLatestQuoteRes>> futures = productNames.stream()
                .map(name -> CompletableFuture.supplyAsync(() -> {
                    try {
                        AgriPriceSearchRes search = agriPriceClientService.searchExactProduct(name);
                        return agriPriceClientService.latestAverage(search.items(), name);
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
                .replaceAll("\\s+", " ")
                .trim();
        return stripped.isEmpty() ? null : stripped;
    }

    static String fallbackSummary(List<AgriPriceLatestQuoteRes> quotes) {
        StringBuilder sb = new StringBuilder("🥬 ราคาเฉลี่ยทุกตลาดวันล่าสุด");
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

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
