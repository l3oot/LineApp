/** โซนเวลาที่ระบบใช้แสดงผล — ตรงกับ backend AppTime.ZONE */
export const APP_TIME_ZONE = "Asia/Bangkok";

const BANGKOK_OFFSET = "+07:00";

/** แปลง txDate จาก user-service (LocalDateTime แบบ Asia/Bangkok) เป็น Date */
export function parseTxDateTime(value: string | number[] | null | undefined): Date {
    if (value == null || value === "") {
        return new Date(Number.NaN);
    }
    if (Array.isArray(value)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = value;
        return new Date(
            `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}${BANGKOK_OFFSET}`,
        );
    }

    const raw = String(value).trim();
    if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
        return new Date(raw);
    }

    const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (localMatch) {
        const second = localMatch[6] ?? "00";
        return new Date(
            `${localMatch[1]}-${localMatch[2]}-${localMatch[3]}T${localMatch[4]}:${localMatch[5]}:${second}${BANGKOK_OFFSET}`,
        );
    }

    return new Date(raw);
}

export function formatTxTime(value: string | number[] | null | undefined, locale = "th-TH"): string {
    const date = parseTxDateTime(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: APP_TIME_ZONE,
        hour12: locale.startsWith("en"),
    });
}

