package com.example.demo.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.example.demo.dto.res.CycleRes;
import com.example.demo.dto.res.CycleSummaryRes;

@Service
public class LineCycleSummaryService {

    static final String NO_CYCLE_REPLY = "ยายยังไม่เจอรอบปลูกเลยจ้า ลองเพิ่มรอบบนเว็บก่อนนะจ๊ะ";
    static final String FALLBACK_REPLY = "👵 ยายสรุปรอบให้หลานไม่ได้ตอนนี้ ลองพิมพ์ สรุปรอบ อีกครั้งนะจ๊ะ";
    private static final Pattern SPACES = Pattern.compile("\\s+");
    private static final Pattern SUMMARY_TRIGGER = Pattern.compile("สรุป\\s*รอบ");

    private final CycleService cycleService;
    private final CycleSummaryService cycleSummaryService;

    public LineCycleSummaryService(CycleService cycleService, CycleSummaryService cycleSummaryService) {
        this.cycleService = cycleService;
        this.cycleSummaryService = cycleSummaryService;
    }

    public static boolean isSummaryRequest(String userText) {
        String text = userText == null ? "" : userText.trim();
        return !text.isEmpty() && SUMMARY_TRIGGER.matcher(text).find();
    }

    public String buildReply(UUID userId, String userText) {
        List<CycleRes> cycles = cycleService.getCyclesByUserId(userId);
        if (cycles.isEmpty()) {
            return NO_CYCLE_REPLY;
        }

        String query = stripSummaryWords(userText);
        CycleRes matched = matchCycle(query, cycles);
        if (matched == null) {
            if (query != null) {
                return "ยายหาไม่เจอรอบ " + query + " จ้า " + askWhichCycle(cycles);
            }
            return askWhichCycle(cycles);
        }

        CycleSummaryRes summary = cycleSummaryService.summarize(userId, matched.cycleId());
        if (summary == null || summary.summary() == null || summary.summary().isBlank()) {
            return FALLBACK_REPLY;
        }
        return summary.summary();
    }

    static String stripSummaryWords(String userText) {
        String text = userText == null ? "" : userText.trim();
        if (text.isEmpty()) {
            return null;
        }
        String stripped = text
                .replaceAll("สรุป\\s*รอบ", " ")
                .replace("ช่วยสรุป", " ")
                .replace("ขอดู", " ")
                .replace("หน่อย", " ")
                .replace("ให้หน่อย", " ")
                .replace("จ้า", " ")
                .replace("นะจ๊ะ", " ")
                .replace("…", " ")
                .replaceAll("\\.{2,}", " ")
                .replaceAll("[?？!！]", " ");
        stripped = SPACES.matcher(stripped).replaceAll(" ").trim();
        return stripped.isEmpty() ? null : stripped;
    }

    static CycleRes matchCycle(String query, List<CycleRes> cycles) {
        if (cycles == null || cycles.isEmpty()) {
            return null;
        }
        if (query == null || isLatestHint(query)) {
            return cycles.size() == 1 || isLatestHint(query) ? cycles.get(0) : null;
        }

        String needle = compact(query);
        List<ScoredCycle> scored = new ArrayList<>();
        for (CycleRes cycle : cycles) {
            int score = scoreCycle(needle, cycle);
            if (score > 0) {
                scored.add(new ScoredCycle(cycle, score, nameLength(cycle)));
            }
        }
        if (scored.isEmpty()) {
            return null;
        }
        scored.sort(Comparator
                .comparingInt(ScoredCycle::score).reversed()
                .thenComparingInt(ScoredCycle::nameLength).reversed());
        int best = scored.get(0).score();
        List<CycleRes> top = scored.stream()
                .filter(row -> row.score() == best)
                .map(ScoredCycle::cycle)
                .toList();
        return top.size() == 1 ? top.get(0) : null;
    }

    static String askWhichCycle(List<CycleRes> cycles) {
        StringBuilder sb = new StringBuilder("หลานอยากสรุปรอบไหนจ๊ะ เช่น สรุปรอบ");
        int limit = Math.min(cycles.size(), 5);
        for (int i = 0; i < limit; i++) {
            if (i == 0) {
                sb.append(cycles.get(i).name());
            } else {
                sb.append(" หรือ สรุปรอบ").append(cycles.get(i).name());
            }
        }
        return sb.toString();
    }

    private static boolean isLatestHint(String query) {
        if (query == null) {
            return false;
        }
        String compact = compact(query);
        return compact.equals("นี้") || compact.equals("ล่าสุด") || compact.equals("ปัจจุบัน")
                || compact.equals("ล่าสุดนี้");
    }

    private static int scoreCycle(String needle, CycleRes cycle) {
        String name = compact(cycle.name());
        String farmType = compact(cycle.farmType());
        int score = 0;
        score = Math.max(score, scoreHaystack(needle, name) + 2);
        if (!farmType.isEmpty()) {
            score = Math.max(score, scoreHaystack(needle, farmType));
        }
        return score;
    }

    private static int scoreHaystack(String needle, String haystack) {
        if (haystack.isEmpty()) {
            return 0;
        }
        if (haystack.equals(needle)) {
            return 100;
        }
        if (haystack.startsWith(needle) || needle.startsWith(haystack)) {
            return 70;
        }
        if (haystack.contains(needle) || needle.contains(haystack)) {
            return 40;
        }
        return 0;
    }

    private static int nameLength(CycleRes cycle) {
        return cycle.name() == null ? 0 : cycle.name().length();
    }

    private static String compact(String value) {
        if (value == null) {
            return "";
        }
        return SPACES.matcher(value.trim().toLowerCase(Locale.ROOT)).replaceAll("");
    }

    private record ScoredCycle(CycleRes cycle, int score, int nameLength) {
    }
}
