package com.example.demo.service;

import java.math.BigDecimal;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.example.demo.dto.res.AiParseRes;
import com.example.demo.dto.res.TransactionRes;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * สร้าง LINE Flex bubble จาก template + ค่าจาก AI parse
 */
@Service
public class LineFlexMessageBuilder {

    private static final Logger log = LoggerFactory.getLogger(LineFlexMessageBuilder.class);
    private static final ZoneId BANGKOK = ZoneId.of("Asia/Bangkok");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final String[] THAI_MONTHS = {
            "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
            "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    };
    private static final String INCOME_TEMPLATE = "line/flex/income.json";
    private static final String EXPENSE_TEMPLATE = "line/flex/expense.json";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * @param timestampMs LINE webhook event timestamp (epoch millis)
     * @param liffBaseUrl ฐาน URL ของ LIFF/Web app สำหรับปุ่มแก้ไข (null = ใช้ postback แทน)
     */
    public Map<String, Object> buildTransactionBubble(
            AiParseRes.Data data,
            TransactionRes tx,
            long timestampMs,
            String liffBaseUrl) {
        LocalDateTime when = LocalDateTime.ofInstant(Instant.ofEpochMilli(timestampMs), BANGKOK);
        String txId = tx.txId().toString();
        return fillBubble(
                templateForType(data.type()),
                resolveTypeLabel(data.type()),
                cycleSubtitle(data.cycleName()),
                categorySubtitle(data.categoryName()),
                data.main(),
                when,
                formatPrice(data.price()),
                txId,
                liffBaseUrl);
    }

    /** Flex card หลังแก้ไขรายการ */
    public Map<String, Object> buildUpdatedTransactionBubble(
            TransactionRes tx,
            String cycleName,
            String categoryName,
            String liffBaseUrl) {
        String txId = tx.txId().toString();
        LocalDateTime when = tx.txDate() != null ? tx.txDate() : LocalDateTime.now(BANGKOK);
        String note = tx.note() != null ? tx.note() : "";
        return fillBubble(
                templateForType(tx.txType()),
                resolveTypeLabel(tx.txType()),
                cycleSubtitle(cycleName),
                categorySubtitle(categoryName),
                note,
                when,
                formatPrice(tx.amount()),
                txId,
                liffBaseUrl);
    }

    public String buildAltText(AiParseRes.Data data) {
        return "บันทึก" + resolveTypeLabel(data.type()) + " " + data.main() + " " + formatPrice(data.price()) + " บาท";
    }

    public String buildUpdatedAltText(TransactionRes tx) {
        String note = tx.note() != null ? tx.note() : "";
        return "แก้ไข" + resolveTypeLabel(tx.txType()) + " " + note + " " + formatPrice(tx.amount()) + " บาท";
    }

    private Map<String, Object> fillBubble(
            String templatePath,
            String typeLabel,
            String cycleName,
            String categoryName,
            String main,
            LocalDateTime when,
            String priceText,
            String txId,
            String liffBaseUrl) {
        String template = loadTemplate(templatePath);
        String editUri = buildEditUri(liffBaseUrl, txId);

        String filled = template
                .replace("{{typeLabel}}", jsonEscape(typeLabel))
                .replace("{{cycleName}}", jsonEscape(cycleName))
                .replace("{{categoryName}}", jsonEscape(categoryName))
                .replace("{{main}}", jsonEscape(main != null ? main : ""))
                .replace("{{txDate}}", jsonEscape(formatThaiDate(when)))
                .replace("{{txTime}}", jsonEscape(when.format(TIME_FMT)))
                .replace("{{txDateTime}}", jsonEscape(formatThaiDateTime(when)))
                .replace("{{price}}", jsonEscape(priceText))
                .replace("{{txDisplayId}}", jsonEscape(formatDisplayId(txId)))
                .replace("{{txId}}", jsonEscape(txId))
                .replace("{{editUri}}", jsonEscape(editUri != null ? editUri : "https://line.me"))
                .replace("{{deleteData}}", jsonEscape("action=delete&id=" + txId));

        try {
            return MAPPER.readValue(filled, new TypeReference<>() {});
        } catch (IOException e) {
            log.error("parse flex template failed: {}", e.getMessage(), e);
            throw new IllegalStateException("invalid flex template", e);
        }
    }

    private static String templateForType(String type) {
        return "income".equalsIgnoreCase(type) ? INCOME_TEMPLATE : EXPENSE_TEMPLATE;
    }

    /** แปลง tx type code → ข้อความแสดงใน card (ไม่ hardcode ใน template) */
    private static String resolveTypeLabel(String type) {
        if (type == null || type.isBlank()) {
            return "-";
        }
        return "income".equalsIgnoreCase(type) ? "รายรับ" : "รายจ่าย";
    }

    private static String cycleSubtitle(String cycleName) {
        if (cycleName == null || cycleName.isBlank()) {
            return "-";
        }
        return cycleName;
    }

    private static String categorySubtitle(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return "-";
        }
        return categoryName;
    }

    private static String formatThaiDate(LocalDateTime dt) {
        int buddhistYear = dt.getYear() + 543;
        String month = THAI_MONTHS[dt.getMonthValue() - 1];
        return dt.getDayOfMonth() + " " + month + " " + buddhistYear;
    }

    private static String formatThaiDateTime(LocalDateTime dt) {
        return formatThaiDate(dt) + "〡" + dt.format(TIME_FMT) + " น.";
    }

    private static String formatPrice(Double price) {
        if (price == null) {
            return "0";
        }
        if (price == Math.floor(price)) {
            return String.format("%,d", price.longValue());
        }
        return String.format("%,.2f", price);
    }

    private static String formatPrice(BigDecimal price) {
        if (price == null) {
            return "0";
        }
        return formatPrice(price.doubleValue());
    }

    private static String formatDisplayId(String txId) {
        if (txId == null || txId.length() < 8) {
            return "#" + (txId != null ? txId : "");
        }
        return "#" + txId.substring(0, 8).toUpperCase();
    }

    private static String buildEditUri(String liffBaseUrl, String txId) {
        if (liffBaseUrl == null || liffBaseUrl.isBlank()) {
            return null;
        }
        return liffBaseUrl.replaceAll("/+$", "") + "/list?editTxId=" + txId;
    }

    private static String jsonEscape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private static String loadTemplate(String classpath) {
        try (InputStream in = new ClassPathResource(classpath).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("cannot load flex template: " + classpath, e);
        }
    }
}
