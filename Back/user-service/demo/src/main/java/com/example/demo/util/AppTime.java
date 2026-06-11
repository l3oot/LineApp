package com.example.demo.util;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/** เวลาในระบบ — ใช้ Asia/Bangkok สำหรับธุรกรรมและแสดงผล */
public final class AppTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");

    private AppTime() {
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }

    public static LocalDateTime fromEpochMilli(long epochMilli) {
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMilli), ZONE);
    }
}
