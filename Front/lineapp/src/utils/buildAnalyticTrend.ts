import dayjs, { type Dayjs } from "dayjs";
import type { AnalyticFilter } from "../data/analyticMockData";
import type { Category, Transaction } from "../lib/userService";
import { displayYearFromGregorian, formatAppDate, formatAppMonthYear } from "./formatAppDate";
import { APP_TIME_ZONE, parseTxDateTime } from "./parseTxDateTime";

function txDayjs(txDate: Transaction["txDate"]): Dayjs {
    const parsed = parseTxDateTime(txDate);
    if (Number.isNaN(parsed.getTime())) return dayjs(Number.NaN);
    return dayjs(parsed);
}

export type DailyTotals = {
    income: number;
    expense: number;
    incomeCount: number;
    expenseCount: number;
};

export type ExpenseShareSlice = {
    label: string;
    amount: number;
    percent: number;
};

export const EXPENSE_PIE_COLORS = [
    "#b23a3a",
    "#c94f4f",
    "#8f2e2e",
    "#d97272",
    "#9a3535",
];

export const INCOME_PIE_COLORS = [
    "#2f8f4e",
    "#3da35d",
    "#5cb87a",
    "#1e6b3a",
    "#7fd99a",
];

export type TrendLineSeries = {
    labels: string[];
    income: number[];
    expense: number[];
};

function filterStart(filter: AnalyticFilter, now: Dayjs): Dayjs {
    switch (filter) {
        case "1M":
            return now.subtract(1, "month").startOf("day");
        case "6M":
            return now.subtract(6, "month").startOf("month");
        case "YTD":
            return now.startOf("year");
        case "1Y":
            return now.subtract(1, "year").startOf("month");
        case "5Y":
            return now.subtract(5, "year").startOf("year");
        case "ALL":
            return dayjs(0);
    }
}

function bucketKey(txDate: Dayjs, filter: AnalyticFilter): string {
    switch (filter) {
        case "1M": {
            const weekStart = txDate.startOf("week");
            return weekStart.format("YYYY-MM-DD");
        }
        case "5Y":
        case "ALL":
            return txDate.format("YYYY");
        default:
            return txDate.format("YYYY-MM");
    }
}

function formatLabel(key: string, filter: AnalyticFilter, lang?: string): string {
    if (filter === "1M") {
        const d = dayjs(key);
        return d.isValid() ? formatAppDate(d.toDate(), lang) : key;
    }
    if (filter === "5Y" || filter === "ALL") {
        const year = Number(key);
        return Number.isNaN(year) ? key : displayYearFromGregorian(year, lang);
    }
    const d = dayjs(`${key}-01`);
    if (!d.isValid()) return key;
    return formatAppMonthYear(d.toDate(), lang);
}

function orderedBucketKeys(filter: AnalyticFilter, start: Dayjs, end: Dayjs): string[] {
    const keys: string[] = [];
    if (filter === "1M") {
        let cursor = start.startOf("week");
        const endWeek = end.startOf("week");
        while (cursor.isBefore(endWeek) || cursor.isSame(endWeek, "week")) {
            keys.push(cursor.format("YYYY-MM-DD"));
            cursor = cursor.add(1, "week");
        }
        return keys;
    }
    if (filter === "5Y" || filter === "ALL") {
        let cursor = start.startOf("year");
        const endYear = end.startOf("year");
        while (cursor.isBefore(endYear) || cursor.isSame(endYear, "year")) {
            keys.push(cursor.format("YYYY"));
            cursor = cursor.add(1, "year");
        }
        return keys;
    }
    let cursor = start.startOf("month");
    const endMonth = end.startOf("month");
    while (cursor.isBefore(endMonth) || cursor.isSame(endMonth, "month")) {
        keys.push(cursor.format("YYYY-MM"));
        cursor = cursor.add(1, "month");
    }
    return keys;
}

export function yearOptionsFromTransactions(
    transactions: Transaction[],
    lang?: string,
    span = 6,
): { value: string; label: string }[] {
    const years = new Set<number>();
    const current = dayjs().year();
    years.add(current);
    for (const tx of transactions) {
        const d = txDayjs(tx.txDate);
        if (d.isValid()) years.add(d.year());
    }
    let earliest = current;
    for (const y of years) earliest = Math.min(earliest, y);
    const start = Math.max(earliest, current - span + 1);
    const result: { value: string; label: string }[] = [];
    for (let y = current; y >= start; y--) {
        result.push({
            value: String(y),
            label: displayYearFromGregorian(y, lang),
        });
    }
    return result;
}

export function buildCategoryShareFromTransactions(
    transactions: Transaction[],
    categories: Category[],
    year: number,
    txType: "expense" | "income",
    othersLabel: string,
    uncategorizedLabel: string,
): ExpenseShareSlice[] {
    const MIN_SLICE_PERCENT = 5;
    const MAX_NAMED_SLICES = 4;

    const nameById = new Map(categories.map((c) => [c.categoryId, c.name]));
    const byCategory = new Map<string, number>();
    let uncategorizedAmount = 0;

    for (const tx of transactions) {
        if (tx.txType !== txType) continue;
        const d = txDayjs(tx.txDate);
        if (!d.isValid() || d.year() !== year) continue;
        const amount = Number(tx.amount);
        if (Number.isNaN(amount) || amount <= 0) continue;
        if (!tx.categoryId || !nameById.has(tx.categoryId)) {
            uncategorizedAmount += amount;
            continue;
        }
        byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + amount);
    }

    const ranked = [...byCategory.entries()]
        .map(([id, amount]) => ({
            label: nameById.get(id)!,
            amount,
        }))
        .sort((a, b) => b.amount - a.amount);

    const total = ranked.reduce((sum, row) => sum + row.amount, 0) + uncategorizedAmount;
    if (total <= 0) return [];

    const addSlice = (target: ExpenseShareSlice[], label: string, amount: number) => {
        if (amount <= 0) return;
        const existing = target.find((row) => row.label === label);
        if (existing) {
            existing.amount += amount;
            existing.percent = Math.round((existing.amount / total) * 100);
            return;
        }
        target.push({
            label,
            amount,
            percent: Math.round((amount / total) * 100),
        });
    };

    const slices: ExpenseShareSlice[] = [];
    let groupedOthersAmount = 0;

    for (const row of ranked) {
        const percent = (row.amount / total) * 100;
        if (percent >= MIN_SLICE_PERCENT && slices.length < MAX_NAMED_SLICES) {
            addSlice(slices, row.label, row.amount);
        } else {
            groupedOthersAmount += row.amount;
        }
    }

    if (uncategorizedAmount > 0) {
        const percent = (uncategorizedAmount / total) * 100;
        if (percent >= MIN_SLICE_PERCENT) {
            addSlice(slices, uncategorizedLabel, uncategorizedAmount);
        } else {
            groupedOthersAmount += uncategorizedAmount;
        }
    }

    addSlice(slices, othersLabel, groupedOthersAmount);

    return slices.sort((a, b) => b.amount - a.amount);
}

export function buildExpenseShareFromTransactions(
    transactions: Transaction[],
    categories: Category[],
    year: number,
    othersLabel: string,
    uncategorizedLabel: string,
): ExpenseShareSlice[] {
    return buildCategoryShareFromTransactions(
        transactions,
        categories,
        year,
        "expense",
        othersLabel,
        uncategorizedLabel,
    );
}

export function buildIncomeShareFromTransactions(
    transactions: Transaction[],
    categories: Category[],
    year: number,
    othersLabel: string,
    uncategorizedLabel: string,
): ExpenseShareSlice[] {
    return buildCategoryShareFromTransactions(
        transactions,
        categories,
        year,
        "income",
        othersLabel,
        uncategorizedLabel,
    );
}

export function buildYearlyBarFromTransactions(
    transactions: Transaction[],
    year: number,
    lang?: string,
): TrendLineSeries {
    const totals = new Map<number, { income: number; expense: number }>();

    for (const tx of transactions) {
        const d = txDayjs(tx.txDate);
        if (!d.isValid() || d.year() !== year) continue;
        const month = d.month();
        const bucket = totals.get(month) ?? { income: 0, expense: 0 };
        const amount = Number(tx.amount);
        if (Number.isNaN(amount)) continue;
        if (tx.txType === "income") bucket.income += amount;
        else if (tx.txType === "expense") bucket.expense += amount;
        totals.set(month, bucket);
    }

    const months = Array.from({ length: 12 }, (_, i) => i);
    return {
        labels: months.map((m) =>
            formatAppMonthYear(dayjs().year(year).month(m).date(1).toDate(), lang),
        ),
        income: months.map((m) => totals.get(m)?.income ?? 0),
        expense: months.map((m) => totals.get(m)?.expense ?? 0),
    };
}

export function buildDailyTotalsFromTransactions(
    transactions: Transaction[],
): Map<string, DailyTotals> {
    const totals = new Map<string, DailyTotals>();

    for (const tx of transactions) {
        const d = parseTxDateTime(tx.txDate);
        if (Number.isNaN(d.getTime())) continue;

        const key = d.toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE });
        const bucket = totals.get(key) ?? { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
        const amount = Number(tx.amount);
        if (Number.isNaN(amount)) continue;
        if (tx.txType === "income") {
            bucket.income += amount;
            bucket.incomeCount += 1;
        } else if (tx.txType === "expense") {
            bucket.expense += amount;
            bucket.expenseCount += 1;
        }
        totals.set(key, bucket);
    }

    return totals;
}

export function formatCompactAmount(amount: number): string {
    if (amount <= 0) return "";
    if (amount >= 1_000_000) {
        const compact = amount / 1_000_000;
        return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}M`;
    }
    if (amount >= 10_000) {
        const compact = amount / 1_000;
        return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}k`;
    }
    return amount.toLocaleString();
}

export function calendarDateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function buildTrendLineFromTransactions(
    transactions: Transaction[],
    filter: AnalyticFilter,
    lang?: string,
): TrendLineSeries {
    const now = dayjs();
    const start = filterStart(filter, now);
    const end = now.endOf("day");

    const totals = new Map<string, { income: number; expense: number }>();

    for (const tx of transactions) {
        const d = txDayjs(tx.txDate);
        if (!d.isValid()) continue;
        if (filter !== "ALL" && d.isBefore(start)) continue;
        if (d.isAfter(end)) continue;

        const key = bucketKey(d, filter);
        const bucket = totals.get(key) ?? { income: 0, expense: 0 };
        const amount = Number(tx.amount);
        if (Number.isNaN(amount)) continue;
        if (tx.txType === "income") bucket.income += amount;
        else if (tx.txType === "expense") bucket.expense += amount;
        totals.set(key, bucket);
    }

    const keysInRange = orderedBucketKeys(filter, start, end);
    const keys = keysInRange.length > 0
        ? keysInRange
        : [...totals.keys()].sort();

    return {
        labels: keys.map((k) => formatLabel(k, filter, lang)),
        income: keys.map((k) => totals.get(k)?.income ?? 0),
        expense: keys.map((k) => totals.get(k)?.expense ?? 0),
    };
}
