import {
    displayYearFromGregorian,
    formatAppMonth,
    formatAppMonthYear,
    intlLocaleForAppLanguage,
} from "./formatAppDate";

/** map ภาษาในแอป (th/en/jp) → locale สำหรับ Intl date */
export function localeForAppLanguage(lang?: string): string {
    return intlLocaleForAppLanguage(lang);
}

export function formatMonthYear(
    value: Date | string | null | undefined,
    lang?: string,
): string {
    return formatAppMonthYear(value, lang);
}

/** ช่วงเดือน+ปี เช่น ส.ค. 2569 - พ.ย. 2569 */
export function formatCycleDateRange(
    start: Date | string | null | undefined,
    end: Date | string | null | undefined,
    lang?: string,
): string {
    const a = formatMonthYear(start, lang);
    const b = formatMonthYear(end, lang);
    if (!a && !b) return "";
    if (!a) return b;
    if (!b) return a;
    return `${a} - ${b}`;
}

/** ช่วงเดือนฐานของพืช (ไม่มีปี) เช่น ส.ค. - พ.ย. */
export function formatMonthRange(
    startMonth: number | null | undefined,
    endMonth: number | null | undefined,
    lang?: string,
): string {
    const a = startMonth != null ? formatAppMonth(startMonth, lang) : "";
    const b = endMonth != null ? formatAppMonth(endMonth, lang) : "";
    if (!a && !b) return "";
    if (!a) return b;
    if (!b) return a;
    return `${a} - ${b}`;
}

/** ดึงแค่เดือนจากวันที่จริง เช่น ส.ค. - พ.ย. (ไม่มีปี) */
export function formatCycleMonthRange(
    start: Date | string | null | undefined,
    end: Date | string | null | undefined,
    lang?: string,
): string {
    const a = formatAppMonth(start, lang);
    const b = formatAppMonth(end, lang);
    if (!a && !b) return "";
    if (!a) return b;
    if (!b) return a;
    return `${a} - ${b}`;
}

/**
 * ป้าย tab รอบปี เช่น `2569 · พ.ค.–ก.พ.`
 * ใช้ปีที่เริ่มรอบ + ช่วงเดือน (รองรับข้ามปี)
 */
export function formatSeasonTabLabel(options: {
    startYear: number;
    startMonth?: number | null;
    endMonth?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    lang?: string;
}): string {
    const year = displayYearFromGregorian(options.startYear, options.lang);
    let monthRange = formatMonthRange(options.startMonth, options.endMonth, options.lang);
    if (!monthRange && (options.startDate || options.endDate)) {
        monthRange = formatCycleMonthRange(options.startDate, options.endDate, options.lang);
    }
    if (!monthRange) return year;
    // ใช้ en-dash ให้กระชับบน tab
    const compact = monthRange.replace(" - ", "–");
    return `${year} · ${compact}`;
}
