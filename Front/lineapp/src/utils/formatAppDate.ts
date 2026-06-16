import {
    BuddhistCalendar,
    CalendarDate,
    GregorianCalendar,
    Time,
    fromDate,
    toCalendar,
    toCalendarDate,
    type DateValue,
} from "@internationalized/date";
import i18n from "i18next";
import dayjs, { type Dayjs } from "dayjs";
import { APP_TIME_ZONE, parseTxDateTime } from "./parseTxDateTime";

const BUDDHIST_ERA_OFFSET = 543;

export type AppLang = "th" | "en" | "jp";

export function appLanguageCode(lang?: string): AppLang {
    const code = (lang ?? i18n.resolvedLanguage ?? "th").split("-")[0];
    if (code === "en") return "en";
    if (code === "jp") return "jp";
    return "th";
}

export function usesBuddhistEra(lang?: string): boolean {
    return appLanguageCode(lang) === "th";
}

export function displayYearFromGregorian(gregorianYear: number, lang?: string): string {
    const year = usesBuddhistEra(lang) ? gregorianYear + BUDDHIST_ERA_OFFSET : gregorianYear;
    return String(year);
}

/** locale สำหรับ react-aria DateInput — ปฏิทินและรูปแบบวันที่ตามภาษาที่เลือก */
export function ariaLocaleForAppLanguage(lang?: string): string {
    const code = appLanguageCode(lang);
    if (code === "th") return "th-TH-u-ca-buddhist";
    if (code === "jp") return "ja-JP";
    return "en-GB";
}

export function intlLocaleForAppLanguage(lang?: string): string {
    const code = appLanguageCode(lang);
    if (code === "en") return "en-GB";
    if (code === "jp") return "ja-JP";
    return "th-TH";
}

/** locale สำหรับแสดงวันที่ (เช่น 11 มิ.ย. 2569) — ไทยใช้ปฏิทินพุทธศักราช */
export function intlDisplayLocaleForAppLanguage(lang?: string): string {
    if (usesBuddhistEra(lang)) return "th-TH-u-ca-buddhist";
    return intlLocaleForAppLanguage(lang);
}

/** @deprecated ใช้ intlDisplayLocaleForAppLanguage แทน */
export const intlMonthYearLocaleForAppLanguage = intlDisplayLocaleForAppLanguage;

function formatIntlDate(
    date: Date,
    options: Intl.DateTimeFormatOptions,
    lang?: string,
): string {
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(intlDisplayLocaleForAppLanguage(lang), {
        ...options,
        timeZone: APP_TIME_ZONE,
    }).format(date);
}

type BangkokDateParts = {
    day: number;
    month: number;
    yearCe: number;
    hour: number;
    minute: number;
};

function getBangkokDateParts(date: Date): BangkokDateParts {
    const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: APP_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    const parts = formatter.formatToParts(date);
    let day = 0;
    let month = 0;
    let yearCe = 0;
    let hour = 0;
    let minute = 0;
    for (const part of parts) {
        if (part.type === "day") day = Number(part.value);
        if (part.type === "month") month = Number(part.value);
        if (part.type === "year") yearCe = Number(part.value);
        if (part.type === "hour") hour = Number(part.value);
        if (part.type === "minute") minute = Number(part.value);
    }
    return { day, month, yearCe, hour, minute };
}

function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

export function formatAppDate(
    value: Date | string | number[] | null | undefined,
    lang?: string,
): string {
    const date = value instanceof Date ? value : parseTxDateTime(value);
    return formatIntlDate(date, { day: "numeric", month: "short", year: "numeric" }, lang);
}

export function formatAppMonthYear(
    value: Date | string | null | undefined,
    lang?: string,
): string {
    if (value == null || value === "") return "";
    const date = value instanceof Date ? value : new Date(value);
    return formatIntlDate(date, { month: "short", year: "numeric" }, lang);
}

export function formatCalendarDate(cd: DateValue, lang?: string): string {
    const gregorian = toGregorianCalendarDate(cd);
    return formatAppDate(
        parseTxDateTime(`${gregorianDateKey(gregorian.year, gregorian.month, gregorian.day)}T12:00:00`),
        lang,
    );
}

export function formatAppDateTime(
    value: Date | string | number[] | null | undefined,
    lang?: string,
): string {
    const date = value instanceof Date ? value : parseTxDateTime(value);
    if (Number.isNaN(date.getTime())) return "";
    const { hour, minute } = getBangkokDateParts(date);
    return `${formatAppDate(date, lang)} ${pad2(hour)}:${pad2(minute)}`;
}

export function toGregorianCalendarDate(cd: DateValue): CalendarDate {
    return toCalendar(cd, new GregorianCalendar());
}

export function toAppCalendarDate(cd: DateValue, lang?: string): CalendarDate {
    const gregorian = toGregorianCalendarDate(cd);
    if (usesBuddhistEra(lang)) {
        return toCalendar(gregorian, new BuddhistCalendar());
    }
    return gregorian;
}

export function gregorianDateKey(year: number, month: number, day: number): string {
    return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function gregorianKeyFromCalendarDate(cd: DateValue): string {
    const gregorian = toGregorianCalendarDate(cd);
    return gregorianDateKey(gregorian.year, gregorian.month, gregorian.day);
}

export function parseTxToGregorianCalendarDate(value: string): CalendarDate {
    return toCalendarDate(fromDate(parseTxDateTime(value), APP_TIME_ZONE));
}

export function calendarDateTimeFromTx(
    value: string,
    lang?: string,
): { date: CalendarDate; time: Time } {
    const parsed = parseTxDateTime(value);
    const gregorian = toCalendarDate(fromDate(parsed, APP_TIME_ZONE));
    const { hour, minute } = getBangkokDateParts(parsed);
    return {
        date: toAppCalendarDate(gregorian, lang),
        time: new Time(hour, minute),
    };
}

export function calendarDateTimeToApi(cd: DateValue, time: Time): string {
    const gregorian = toGregorianCalendarDate(cd);
    return `${gregorianDateKey(gregorian.year, gregorian.month, gregorian.day)}T${pad2(time.hour)}:${pad2(time.minute)}:00`;
}

export function calendarDateToApiStart(cd: DateValue): string {
    const gregorian = toGregorianCalendarDate(cd);
    return `${gregorianDateKey(gregorian.year, gregorian.month, gregorian.day)}T00:00:00`;
}

export function calendarDateToApiEnd(cd: DateValue): string {
    const gregorian = toGregorianCalendarDate(cd);
    return `${gregorianDateKey(gregorian.year, gregorian.month, gregorian.day)}T23:59:59`;
}

/** รูปแบบวันที่สำหรับ MUI DatePicker — ไทยใช้ BBBB คู่กับ AdapterDayjsBuddhist */
export function dayjsDateFormat(lang?: string): string {
    const code = appLanguageCode(lang);
    if (code === "jp") return "YYYY年M月D日";
    if (code === "en") return "D MMM YYYY";
    return "D MMM BBBB";
}

export function dayjsLocaleForAppLanguage(lang?: string): string {
    const code = appLanguageCode(lang);
    if (code === "jp") return "ja";
    if (code === "en") return "en";
    return "th";
}

type MuiFieldPlaceholderText = {
    fieldDayPlaceholder?: () => string;
    fieldMonthPlaceholder?: () => string;
    fieldYearPlaceholder?: () => string;
};

function muiDateFieldPlaceholders(lang?: string): MuiFieldPlaceholderText {
    const code = appLanguageCode(lang);
    if (code === "jp") {
        return {
            fieldYearPlaceholder: () => "YYYY",
            fieldMonthPlaceholder: () => "M",
            fieldDayPlaceholder: () => "D",
        };
    }
    if (code === "en") {
        return {
            fieldDayPlaceholder: () => "D",
            fieldMonthPlaceholder: () => "MMM",
            fieldYearPlaceholder: () => "YYYY",
        };
    }
    return {
        fieldDayPlaceholder: () => "D",
        fieldMonthPlaceholder: () => "MMM",
        fieldYearPlaceholder: () => "BBBB",
    };
}

/** localeText สำหรับ MUI DatePicker — ไม่พึ่ง @mui/x-date-pickers/locales (v9 ไม่ export) */
export function muiPickerLocaleText(lang?: string) {
    const code = appLanguageCode(lang);
    const placeholders = muiDateFieldPlaceholders(lang);

    if (code === "jp") {
        return {
            ...placeholders,
            previousMonth: "先月",
            nextMonth: "来月",
            cancelButtonLabel: "キャンセル",
            clearButtonLabel: "クリア",
            okButtonLabel: "確定",
            todayButtonLabel: "今日",
            datePickerToolbarTitle: "日付を選択",
        };
    }

    if (code === "en") {
        return {
            ...placeholders,
            previousMonth: "Previous month",
            nextMonth: "Next month",
            cancelButtonLabel: "Cancel",
            clearButtonLabel: "Clear",
            okButtonLabel: "OK",
            todayButtonLabel: "Today",
            datePickerToolbarTitle: "Select date",
        };
    }

    return {
        ...placeholders,
        previousMonth: "เดือนก่อนหน้า",
        nextMonth: "เดือนถัดไป",
        cancelButtonLabel: "ยกเลิก",
        clearButtonLabel: "ล้าง",
        okButtonLabel: "ตกลง",
        todayButtonLabel: "วันนี้",
        datePickerToolbarTitle: "เลือกวันที่",
    };
}

export function initialAppDateTime(lang?: string): { date: CalendarDate; time: Time } {
    const parts = getBangkokDateParts(new Date());
    const gregorian = new CalendarDate(parts.yearCe, parts.month, parts.day);
    return {
        date: toAppCalendarDate(gregorian, lang),
        time: new Time(parts.hour, parts.minute),
    };
}

/** วันนี้ (โซน Bangkok) สำหรับ MUI DatePicker */
export function defaultPickerDayjs(lang?: string): Dayjs {
    const { date } = initialAppDateTime(lang);
    const gregorian = toGregorianCalendarDate(date);
    return dayjs(gregorianDateKey(gregorian.year, gregorian.month, gregorian.day));
}
