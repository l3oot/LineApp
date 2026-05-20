import i18n from "i18next";

/** map ภาษาในแอป (th/en/jp) → locale สำหรับ Intl date */
export function localeForAppLanguage(lang?: string): string {
    const code = (lang ?? i18n.resolvedLanguage ?? "th").split("-")[0];
    if (code === "en") return "en-US";
    if (code === "jp") return "ja-JP";
    return "th-TH";
}

export function formatMonthYear(
    value: Date | string | null | undefined,
    lang?: string,
): string {
    if (value == null || value === "") return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(localeForAppLanguage(lang), {
        month: "short",
        year: "numeric",
    });
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
