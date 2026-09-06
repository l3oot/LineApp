package com.example.demo.service;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Predicate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.demo.dto.req.WeatherForecastQuery;
import com.example.demo.dto.res.AiWeatherBriefRes;
import com.example.demo.dto.res.UserProfileRes;
import com.example.demo.dto.res.WeatherForecastRes;
import com.example.demo.dto.res.WeatherHourRes;
import com.example.demo.util.AppTime;

@Service
public class LineWeatherBriefService {

    private static final Logger log = LoggerFactory.getLogger(LineWeatherBriefService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final int MAX_CHARS = 300;
    private static final String FALLBACK_REPLY = "🌦️ ยายยังดึงอากาศไม่ได้ตอนนี้ ลองพิมพ์ สภาพอากาศ อีกครั้งนะจ๊ะ";
    private static final String[] CONDITION_THAI = {
        "ไม่ระบุ",
        "ท้องฟ้าแจ่มใส",
        "มีเมฆบางส่วน",
        "เมฆเป็นส่วนมาก",
        "มีเมฆมาก",
        "ฝนตกเล็กน้อย",
        "ฝนปานกลาง",
        "ฝนตกหนัก",
        "ฝนฟ้าคะนอง",
        "อากาศหนาวจัด",
        "อากาศหนาว",
        "อากาศเย็น",
        "อากาศร้อนจัด"
    };

    private final UserProfileService userProfileService;
    private final WeatherClientService weatherClientService;
    private final AiClientService aiClientService;

    public LineWeatherBriefService(
            UserProfileService userProfileService,
            WeatherClientService weatherClientService,
            AiClientService aiClientService) {
        this.userProfileService = userProfileService;
        this.weatherClientService = weatherClientService;
        this.aiClientService = aiClientService;
    }

    public String buildBrief(UUID userId) {
        String hourlyText = fetchHourlyText(userId);
        if (hourlyText == null) {
            return FALLBACK_REPLY;
        }

        AiWeatherBriefRes ai = aiClientService.summarizeWeatherBrief(hourlyText);
        if (ai != null && ai.summary() != null && !ai.summary().isBlank()) {
            return limitChars(ai.summary());
        }
        return fallbackFromData(hourlyText);
    }

    private String fetchHourlyText(UUID userId) {
        UserProfileRes profile = userProfileService.getByUserId(userId);
        String province = blankToNull(profile.province());
        String amphoe = blankToNull(profile.district());
        String tambon = blankToNull(profile.subDistrict());
        if (province == null) {
            return "ไม่มีข้อมูลจังหวัดจ้า";
        }
        String date = AppTime.now().toLocalDate().format(DATE);
        try {
            WeatherForecastRes forecast = weatherClientService.forecast(
                    new WeatherForecastQuery(province, amphoe, tambon, date, null, 24));
            return compactHourly(forecast);
        } catch (Exception e) {
            log.warn("[line-weather] hourly fetch failed: {}", e.getMessage());
            return null;
        }
    }

    private static String compactHourly(WeatherForecastRes forecast) {
        List<WeatherHourRes> hours = mergeHours(forecast);
        StringBuilder sb = new StringBuilder();
        if (forecast.locationLabel() != null && !forecast.locationLabel().isBlank()) {
            sb.append("พื้นที่: ").append(forecast.locationLabel()).append('\n');
        }
        WeatherHourRes now = forecast.current();
        if (now != null) {
            sb.append("ตอนนี้ ").append(clock(now.time())).append(": ")
                    .append(hourDetail(now)).append('\n');
        }
        List<WeatherHourRes> upcoming = fromCurrent(hours, now);
        if (!upcoming.isEmpty()) {
            int min = upcoming.stream().mapToInt(WeatherHourRes::temperatureC).min().orElse(0);
            int max = upcoming.stream().mapToInt(WeatherHourRes::temperatureC).max().orElse(0);
            sb.append("ช่วงที่เหลือวันนี้ ต่ำสุด ").append(min).append("°C สูงสุด ").append(max).append("°C\n");
            sb.append(periodLine("เช้า 05:00-11:00", upcoming, hour -> inHourRange(hour, 5, 11)));
            sb.append(periodLine("กลางวัน 12:00-15:00", upcoming, hour -> inHourRange(hour, 12, 15)));
            sb.append(periodLine("เย็น 16:00-18:00", upcoming, hour -> inHourRange(hour, 16, 18)));
            sb.append(periodLine("ค่ำ-ดึก 19:00-04:00", upcoming, LineWeatherBriefService::isNightHour));
            sb.append("รายชั่วโมง:\n");
            for (WeatherHourRes hour : upcoming) {
                sb.append(clock(hour.time())).append(' ').append(hourDetail(hour)).append('\n');
            }
        }
        String text = sb.toString().trim();
        return text.length() > 4000 ? text.substring(0, 4000) : text;
    }

    private static List<WeatherHourRes> mergeHours(WeatherForecastRes forecast) {
        Map<String, WeatherHourRes> byTime = new LinkedHashMap<>();
        if (forecast.current() != null && forecast.current().time() != null) {
            byTime.put(forecast.current().time(), forecast.current());
        }
        if (forecast.hours() != null) {
            for (WeatherHourRes hour : forecast.hours()) {
                if (hour != null && hour.time() != null) {
                    byTime.putIfAbsent(hour.time(), hour);
                }
            }
        }
        List<WeatherHourRes> hours = new ArrayList<>(byTime.values());
        hours.sort(Comparator.comparing(WeatherHourRes::time));
        return hours;
    }

    private static List<WeatherHourRes> fromCurrent(List<WeatherHourRes> hours, WeatherHourRes current) {
        if (current == null || current.time() == null) {
            return hours;
        }
        return hours.stream()
                .filter(hour -> hour.time().compareTo(current.time()) >= 0)
                .toList();
    }

    private static String periodLine(String label, List<WeatherHourRes> hours, Predicate<WeatherHourRes> match) {
        List<WeatherHourRes> slice = hours.stream().filter(match).toList();
        if (slice.isEmpty()) {
            return "";
        }
        int tempMin = slice.stream().mapToInt(WeatherHourRes::temperatureC).min().orElse(0);
        int tempMax = slice.stream().mapToInt(WeatherHourRes::temperatureC).max().orElse(0);
        int rhMin = slice.stream().mapToInt(WeatherHourRes::humidityPercent).min().orElse(0);
        int rhMax = slice.stream().mapToInt(WeatherHourRes::humidityPercent).max().orElse(0);
        StringBuilder sb = new StringBuilder();
        sb.append("ช่วง").append(label).append(": ");
        if (tempMin == tempMax) {
            sb.append(tempMin).append("°C");
        } else {
            sb.append(tempMin).append("-").append(tempMax).append("°C");
        }
        sb.append(" ความชื้น ");
        if (rhMin == rhMax) {
            sb.append(rhMin).append("%");
        } else {
            sb.append(rhMin).append("-").append(rhMax).append("%");
        }
        sb.append(' ').append(conditionThai(dominantCondition(slice)));
        List<String> rainHours = slice.stream()
                .filter(hour -> isRain(hour.condition()))
                .map(hour -> clock(hour.time()))
                .toList();
        if (!rainHours.isEmpty()) {
            sb.append(" มีฝน ").append(String.join(", ", rainHours));
        }
        sb.append('\n');
        return sb.toString();
    }

    private static int dominantCondition(List<WeatherHourRes> hours) {
        return hours.stream()
                .mapToInt(WeatherHourRes::condition)
                .filter(condition -> condition >= 1)
                .boxed()
                .max(Comparator
                        .comparingInt((Integer condition) -> isRain(condition) ? 100 + condition : 0)
                        .thenComparingInt(condition -> frequency(hours, condition))
                        .thenComparingInt(condition -> condition))
                .orElse(0);
    }

    private static int frequency(List<WeatherHourRes> hours, int condition) {
        int count = 0;
        for (WeatherHourRes hour : hours) {
            if (hour.condition() == condition) {
                count++;
            }
        }
        return count;
    }

    private static String hourDetail(WeatherHourRes hour) {
        return hour.temperatureC() + "°C ความชื้น " + hour.humidityPercent() + "% " + conditionThai(hour.condition());
    }

    private static String conditionThai(int condition) {
        if (condition < 1 || condition >= CONDITION_THAI.length) {
            return CONDITION_THAI[0];
        }
        return CONDITION_THAI[condition];
    }

    private static boolean isRain(int condition) {
        return condition >= 5 && condition <= 8;
    }

    private static boolean inHourRange(WeatherHourRes hour, int start, int end) {
        int value = bangkokHour(hour.time());
        return value >= start && value <= end;
    }

    private static boolean isNightHour(WeatherHourRes hour) {
        int value = bangkokHour(hour.time());
        return value >= 19 || value <= 4;
    }

    private static int bangkokHour(String time) {
        OffsetDateTime parsed = parseTime(time);
        return parsed == null ? -1 : parsed.atZoneSameInstant(AppTime.ZONE).getHour();
    }

    private static String clock(String time) {
        OffsetDateTime parsed = parseTime(time);
        if (parsed == null) {
            return time == null ? "" : time;
        }
        return parsed.atZoneSameInstant(AppTime.ZONE).toLocalTime()
                .format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    private static OffsetDateTime parseTime(String time) {
        if (time == null || time.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(time);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private static String fallbackFromData(String hourlyText) {
        StringBuilder sb = new StringBuilder("🌦️ ");
        if (hourlyText != null) {
            String first = hourlyText.lines().limit(3).reduce((a, b) -> a + " " + b).orElse(hourlyText);
            sb.append(first);
        }
        String text = sb.toString().trim();
        return text.isEmpty() ? FALLBACK_REPLY : limitChars(text);
    }

    private static String limitChars(String text) {
        String compact = text.replaceAll("\\s+", " ").trim();
        if (compact.codePointCount(0, compact.length()) <= MAX_CHARS) {
            return compact;
        }
        int end = compact.offsetByCodePoints(0, MAX_CHARS);
        return compact.substring(0, end).trim();
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
