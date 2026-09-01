package com.example.demo.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.demo.dto.res.AiCycleSummaryRes;
import com.example.demo.dto.res.CategoryRes;
import com.example.demo.dto.res.CycleRes;
import com.example.demo.dto.res.CycleSummaryRes;
import com.example.demo.dto.res.TransactionRes;

@Service
public class CycleSummaryService {

    private static final Logger log = LoggerFactory.getLogger(CycleSummaryService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final int MAX_CHARS = 500;
    private static final int MAX_TX_LINES = 40;
    private static final String UNCATEGORIZED = "ไม่ระบุหมวด";

    private final CycleService cycleService;
    private final TransactionService transactionService;
    private final CategoryService categoryService;
    private final AiClientService aiClientService;

    public CycleSummaryService(
            CycleService cycleService,
            TransactionService transactionService,
            CategoryService categoryService,
            AiClientService aiClientService) {
        this.cycleService = cycleService;
        this.transactionService = transactionService;
        this.categoryService = categoryService;
        this.aiClientService = aiClientService;
    }

    public CycleSummaryRes summarize(UUID userId, UUID cycleId) {
        CycleRes cycle = cycleService.getCycle(cycleId, userId);
        List<TransactionRes> txs = transactionService.listTransactions(userId, cycleId);
        if (txs.isEmpty()) {
            return new CycleSummaryRes(
                    cycle.name(),
                    "👵 รอบ " + cycle.name() + " ยังไม่มีรายการเลยจ้า ลองบันทึกรายรับรายจ่ายก่อนนะจ๊ะ");
        }

        Map<UUID, String> categoryNames = categoryNames(userId);
        CycleMoneyStats stats = statsOf(txs, categoryNames);
        String cycleInfo = compactCycleInfo(cycle, stats);
        String transactionData = compactTransactions(txs, categoryNames, stats);

        AiCycleSummaryRes ai = aiClientService.summarizeCycle(cycleInfo, transactionData);
        if (ai != null && ai.summary() != null && !ai.summary().isBlank()) {
            return new CycleSummaryRes(cycle.name(), limitChars(ai.summary()));
        }
        log.warn("[cycle-summary] AI empty, using fallback cycleId={}", cycleId);
        return new CycleSummaryRes(cycle.name(), fallbackSummary(cycle.name(), stats));
    }

    private Map<UUID, String> categoryNames(UUID userId) {
        Map<UUID, String> names = new HashMap<>();
        for (CategoryRes category : categoryService.listCategories(userId, null)) {
            names.put(category.categoryId(), category.name());
        }
        return names;
    }

    static CycleMoneyStats statsOf(List<TransactionRes> txs, Map<UUID, String> categoryNames) {
        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expense = BigDecimal.ZERO;
        Map<String, BigDecimal> incomeByLabel = new HashMap<>();
        Map<String, BigDecimal> expenseByLabel = new HashMap<>();
        for (TransactionRes tx : txs) {
            BigDecimal amount = tx.amount() == null ? BigDecimal.ZERO : tx.amount();
            String label = labelOf(tx, categoryNames);
            if (isIncome(tx.txType())) {
                income = income.add(amount);
                incomeByLabel.merge(label, amount, BigDecimal::add);
            } else {
                expense = expense.add(amount);
                expenseByLabel.merge(label, amount, BigDecimal::add);
            }
        }
        return new CycleMoneyStats(
                income,
                expense,
                income.subtract(expense),
                txs.size(),
                topLabel(expenseByLabel),
                topLabel(incomeByLabel),
                ranked(expenseByLabel),
                ranked(incomeByLabel));
    }

    private static String compactCycleInfo(CycleRes cycle, CycleMoneyStats stats) {
        StringBuilder sb = new StringBuilder();
        sb.append("ชื่อรอบ: ").append(cycle.name()).append('\n');
        if (cycle.farmType() != null && !cycle.farmType().isBlank()) {
            sb.append("ประเภท: ").append(cycle.farmType()).append('\n');
        }
        sb.append("ช่วง: ").append(cycle.startDate()).append(" ถึง ").append(cycle.endDate()).append('\n');
        if (cycle.budgetAmount() != null) {
            sb.append("งบ: ").append(formatAmount(cycle.budgetAmount())).append('\n');
        }
        sb.append("รายรับรวม: ").append(formatAmount(stats.income())).append('\n');
        sb.append("รายจ่ายรวม: ").append(formatAmount(stats.expense())).append('\n');
        sb.append("รายรับลบรายจ่าย: ").append(formatAmount(stats.net())).append('\n');
        sb.append("จำนวนรายการ: ").append(stats.txCount());
        return sb.toString();
    }

    private static String compactTransactions(
            List<TransactionRes> txs,
            Map<UUID, String> categoryNames,
            CycleMoneyStats stats) {
        StringBuilder sb = new StringBuilder();
        sb.append("รายจ่ายตามหมวด (มาก→น้อย):\n");
        appendRanks(sb, stats.expenseRanks());
        sb.append("รายรับตามหมวด (มาก→น้อย):\n");
        appendRanks(sb, stats.incomeRanks());
        sb.append("รายการล่าสุด:\n");
        int limit = Math.min(txs.size(), MAX_TX_LINES);
        for (int i = 0; i < limit; i++) {
            TransactionRes tx = txs.get(i);
            sb.append(tx.txDate() != null ? tx.txDate().format(DATE) : "-")
                    .append(' ')
                    .append(isIncome(tx.txType()) ? "รายรับ" : "รายจ่าย")
                    .append(' ')
                    .append(labelOf(tx, categoryNames))
                    .append(' ')
                    .append(tx.note() != null ? tx.note() : "")
                    .append(' ')
                    .append(formatAmount(tx.amount()))
                    .append('\n');
        }
        String text = sb.toString().trim();
        return text.length() > 4000 ? text.substring(0, 4000) : text;
    }

    static String fallbackSummary(String cycleName, CycleMoneyStats stats) {
        StringBuilder sb = new StringBuilder("👵 รอบ ").append(cycleName).append(' ');
        if (stats.topExpense() != null) {
            sb.append("หลานใช้เงินไปกับ ").append(stats.topExpense().label())
                    .append(" เยอะสุด ").append(formatAmount(stats.topExpense().amount())).append(" บาท ");
        }
        if (stats.topIncome() != null) {
            sb.append("ได้เงินจาก ").append(stats.topIncome().label())
                    .append(" ").append(formatAmount(stats.topIncome().amount())).append(" บาท ");
        }
        if (stats.net().signum() > 0) {
            sb.append("รอบนี้รายรับมากกว่าจ่ายอยู่ ").append(formatAmount(stats.net())).append(" บาท ");
            sb.append("เก็บรายการต่อเนื่องแล้วรอบหน้าจะเห็นภาพชัดขึ้นนะจ๊ะ");
        } else if (stats.net().signum() < 0) {
            sb.append("รอบนี้จ่ายเกินรายรับ ").append(formatAmount(stats.net().abs())).append(" บาท ");
            if (stats.topExpense() != null) {
                sb.append("ลองคุม ").append(stats.topExpense().label()).append(" ให้ลดลงหน่อยนะจ๊ะ");
            } else {
                sb.append("ลองทบทวนรายจ่ายก้อนใหญ่ก่อนนะจ๊ะ");
            }
        } else {
            sb.append("รอบนี้รายรับกับรายจ่ายพอ ๆ กันจ้า เก็บรายการต่อแล้วยายจะช่วยดูให้นะจ๊ะ");
        }
        return limitChars(sb.toString());
    }

    private static void appendRanks(StringBuilder sb, List<LabeledAmount> ranks) {
        if (ranks.isEmpty()) {
            sb.append("(ไม่มี)\n");
            return;
        }
        int limit = Math.min(ranks.size(), 8);
        for (int i = 0; i < limit; i++) {
            LabeledAmount row = ranks.get(i);
            sb.append(row.label()).append(' ').append(formatAmount(row.amount())).append('\n');
        }
    }

    private static String labelOf(TransactionRes tx, Map<UUID, String> categoryNames) {
        if (tx.categoryId() != null) {
            String name = categoryNames.get(tx.categoryId());
            if (name != null && !name.isBlank()) {
                return name;
            }
        }
        if (tx.note() != null && !tx.note().isBlank()) {
            return tx.note().trim();
        }
        return UNCATEGORIZED;
    }

    private static LabeledAmount topLabel(Map<String, BigDecimal> byLabel) {
        return byLabel.entrySet().stream()
                .max(Comparator.comparing(Map.Entry::getValue))
                .map(e -> new LabeledAmount(e.getKey(), e.getValue()))
                .orElse(null);
    }

    private static List<LabeledAmount> ranked(Map<String, BigDecimal> byLabel) {
        List<LabeledAmount> rows = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : byLabel.entrySet()) {
            rows.add(new LabeledAmount(entry.getKey(), entry.getValue()));
        }
        rows.sort(Comparator.comparing(LabeledAmount::amount).reversed());
        return rows;
    }

    private static boolean isIncome(String type) {
        return type != null && "income".equalsIgnoreCase(type.trim());
    }

    static String formatAmount(BigDecimal value) {
        if (value == null) {
            return "0";
        }
        BigDecimal scaled = value.setScale(2, RoundingMode.HALF_UP);
        if (scaled.stripTrailingZeros().scale() <= 0) {
            return String.format(Locale.US, "%,d", scaled.longValue());
        }
        return String.format(Locale.US, "%,.2f", scaled);
    }

    static String limitChars(String text) {
        String compact = text.replaceAll("\\s+", " ").trim();
        if (compact.codePointCount(0, compact.length()) <= MAX_CHARS) {
            return compact;
        }
        int end = compact.offsetByCodePoints(0, MAX_CHARS);
        return compact.substring(0, end).trim();
    }

    record LabeledAmount(String label, BigDecimal amount) {
    }

    record CycleMoneyStats(
            BigDecimal income,
            BigDecimal expense,
            BigDecimal net,
            int txCount,
            LabeledAmount topExpense,
            LabeledAmount topIncome,
            List<LabeledAmount> expenseRanks,
            List<LabeledAmount> incomeRanks) {
    }
}
