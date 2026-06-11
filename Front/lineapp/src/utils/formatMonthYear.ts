import { formatAppMonthYear, intlLocaleForAppLanguage } from "./formatAppDate";

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
