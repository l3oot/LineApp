import { APP_TIME_ZONE, parseTxDateTime } from "./parseTxDateTime";
import type { Transaction } from "../lib/userService";

export type SeasonWindow = {
    id: string;
    startYear: number;
    startDate: string;
    endDate: string;
};

type BangkokDate = { year: number; month: number; day: number };

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

function bangkokDate(date: Date): BangkokDate | null {
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: APP_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    if (!year || !month || !day) return null;
    return { year, month, day };
}

function lastDayOfMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function seasonWindowForYear(
    startMonth: number,
    endMonth: number,
    startYear: number,
): SeasonWindow {
    const endYear = endMonth >= startMonth ? startYear : startYear + 1;
    const endDay = lastDayOfMonth(endYear, endMonth);
    return {
        id: String(startYear),
        startYear,
        startDate: `${startYear}-${pad(startMonth)}-01`,
        endDate: `${endYear}-${pad(endMonth)}-${pad(endDay)}`,
    };
}

/** ปีเริ่มของรอบที่วันที่นี้อยู่ ถ้าอยู่นอกช่วงเดือนของพืชจะได้ null */
export function seasonStartYearForDate(
    date: Date,
    startMonth: number,
    endMonth: number,
): number | null {
    const parts = bangkokDate(date);
    if (!parts) return null;
    if (endMonth >= startMonth) {
        return parts.month >= startMonth && parts.month <= endMonth ? parts.year : null;
    }
    if (parts.month >= startMonth) return parts.year;
    if (parts.month <= endMonth) return parts.year - 1;
    return null;
}

/** รอบที่กำลังนับอยู่: ช่วงปีนี้ หรือปีถัดไปถ้ารอบปีนี้จบไปแล้ว */
export function activeSeasonStartYear(
    startMonth: number,
    endMonth: number,
    today: Date = new Date(),
): number {
    const parts = bangkokDate(today) ?? {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
    };
    if (endMonth >= startMonth) {
        return parts.month > endMonth ? parts.year + 1 : parts.year;
    }
    if (parts.month <= endMonth) return parts.year - 1;
    return parts.year;
}

export function isInSeasonWindow(date: Date, startDate: string, endDate: string): boolean {
    if (Number.isNaN(date.getTime())) return false;
    const startMs = Date.parse(`${startDate}T00:00:00+07:00`);
    const endMs = Date.parse(`${endDate}T23:59:59.999+07:00`);
    const ms = date.getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false;
    return ms >= startMs && ms <= endMs;
}

export function yearSeasonsFromDates(
    startMonth: number,
    endMonth: number,
    dates: Date[],
): SeasonWindow[] {
    const years = new Set<number>([activeSeasonStartYear(startMonth, endMonth)]);
    for (const date of dates) {
        const year = seasonStartYearForDate(date, startMonth, endMonth);
        if (year != null) years.add(year);
    }
    return [...years]
        .sort((a, b) => b - a)
        .map((year) => seasonWindowForYear(startMonth, endMonth, year));
}

export function transactionInSeasonWindow(tx: Transaction, window: SeasonWindow): boolean {
    return isInSeasonWindow(parseTxDateTime(tx.txDate), window.startDate, window.endDate);
}
