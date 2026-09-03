package com.example.demo.service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    private final UserProfileService userProfileService;
    private final WeatherClientService weatherClientService;
    private final WeatherWarningService weatherWarningService;
    private final AiClientService aiClientService;

    public LineWeatherBriefService(
            UserProfileService userProfileService,
            WeatherClientService weatherClientService,
            WeatherWarningService weatherWarningService,
            AiClientService aiClientService) {
        this.userProfileService = userProfileService;
        this.weatherClientService = weatherClientService;
        this.weatherWarningService = weatherWarningService;
        this.aiClientService = aiClientService;
    }

    public String buildBrief(UUID userId) {
        String hourlyText = fetchHourlyText(userId);
        String descriptionThai = weatherWarningService.latestDescriptionThai();
        if (hourlyText == null && (descriptionThai == null || descriptionThai.isBlank())) {
            return FALLBACK_REPLY;
        }

        AiWeatherBriefRes ai = aiClientService.summarizeWeatherBrief(
                hourlyText != null ? hourlyText : "ไม่มีข้อมูลพยากรณ์รายชั่วโมง",
                descriptionThai != null ? descriptionThai : "");
        if (ai != null && ai.summary() != null && !ai.summary().isBlank()) {
            return limitChars(ai.summary());
        }
        return fallbackFromData(hourlyText, descriptionThai);
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
        StringBuilder sb = new StringBuilder();
        if (forecast.locationLabel() != null && !forecast.locationLabel().isBlank()) {
            sb.append("พื้นที่: ").append(forecast.locationLabel()).append('\n');
        }
        List<WeatherHourRes> hours = new ArrayList<>();
        if (forecast.current() != null) {
            hours.add(forecast.current());
            WeatherHourRes now = forecast.current();
            sb.append("ตอนนี้: ").append(now.temperatureC()).append("°C ความชื้น ")
                    .append(now.humidityPercent()).append("% สภาพ ").append(now.condition()).append('\n');
        }
        if (forecast.hours() != null) {
            hours.addAll(forecast.hours());
        }
        if (!hours.isEmpty()) {
            int min = hours.stream().mapToInt(WeatherHourRes::temperatureC).min().orElse(0);
            int max = hours.stream().mapToInt(WeatherHourRes::temperatureC).max().orElse(0);
            sb.append("24ชม. ต่ำสุด ").append(min).append("° สูงสุด ").append(max).append("°\n");
            sb.append("รายชั่วโมง: ");
            for (WeatherHourRes hour : hours) {
                sb.append(hour.time()).append(' ').append(hour.temperatureC())
                        .append("° cond").append(hour.condition()).append("; ");
            }
        }
        String text = sb.toString().trim();
        return text.length() > 4000 ? text.substring(0, 4000) : text;
    }

    private static String fallbackFromData(String hourlyText, String descriptionThai) {
        StringBuilder sb = new StringBuilder("🌦️ ");
        if (hourlyText != null) {
            String first = hourlyText.lines().limit(2).reduce((a, b) -> a + " " + b).orElse(hourlyText);
            sb.append(first);
        }
        if (descriptionThai != null && !descriptionThai.isBlank()) {
            if (sb.length() > 3) {
                sb.append(" ⚠️ ");
            }
            sb.append(descriptionThai);
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
