import dayjs, { type Dayjs } from "dayjs";
import type { AnalyticFilter } from "../data/analyticMockData";
import type { Category, Transaction } from "../lib/userService";

export type ExpenseShareSlice = {
    label: string;
    amount: number;
    percent: number;
};

export const EXPENSE_PIE_COLORS = [
    "#2f8f4e",
    "#a7772d",
    "#b23a3a",
    "#2d6fbe",
    "#6b46b8",
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

function formatLabel(key: string, filter: AnalyticFilter, locale: string): string {
    if (filter === "1M") {
        const d = dayjs(key);
        return d.isValid()
            ? d.toDate().toLocaleDateString(locale, { day: "numeric", month: "short" })
            : key;
    }
    if (filter === "5Y" || filter === "ALL") {
        return key;
    }
    const d = dayjs(`${key}-01`);
    if (!d.isValid()) return key;
    const opts: Intl.DateTimeFormatOptions =
        filter === "YTD"
            ? { month: "short" }
            : { month: "short", year: "2-digit" };
    return d.toDate().toLocaleDateString(locale, opts);
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
    span = 6,
): { value: string }[] {
    const years = new Set<number>();
    const current = dayjs().year();
    years.add(current);
    for (const tx of transactions) {
        const d = dayjs(tx.txDate);
        if (d.isValid()) years.add(d.year());
    }
    let earliest = current;
    for (const y of years) earliest = Math.min(earliest, y);
    const start = Math.max(earliest, current - span + 1);
    const result: { value: string }[] = [];
    for (let y = current; y >= start; y--) {
        result.push({ value: String(y) });
    }
    return result;
}

export function buildExpenseShareFromTransactions(
    transactions: Transaction[],
    categories: Category[],
    year: number,
    othersLabel: string,
): ExpenseShareSlice[] {
    const nameById = new Map(categories.map((c) => [c.categoryId, c.name]));
    const byCategory = new Map<string, number>();
    let uncategorized = 0;

    for (const tx of transactions) {
        if (tx.txType !== "expense") continue;
        const d = dayjs(tx.txDate);
        if (!d.isValid() || d.year() !== year) continue;
        const amount = Number(tx.amount);
        if (Number.isNaN(amount) || amount <= 0) continue;
        if (!tx.categoryId) {
            uncategorized += amount;
            continue;
        }
        byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + amount);
    }

    const ranked = [...byCategory.entries()]
        .map(([id, amount]) => ({
            label: nameById.get(id) ?? othersLabel,
            amount,
        }))
        .sort((a, b) => b.amount - a.amount);

    const total =
        ranked.reduce((sum, row) => sum + row.amount, 0) + uncategorized;
    if (total <= 0) return [];

    const top = ranked.slice(0, 4);
    const restAmount =
        ranked.slice(4).reduce((sum, row) => sum + row.amount, 0) + uncategorized;
    const slices: ExpenseShareSlice[] = top.map((row) => ({
        label: row.label,
        amount: row.amount,
        percent: Math.round((row.amount / total) * 100),
    }));

    if (restAmount > 0) {
        slices.push({
            label: othersLabel,
            amount: restAmount,
            percent: Math.round((restAmount / total) * 100),
        });
    }

    return slices;
}

export function buildYearlyBarFromTransactions(
    transactions: Transaction[],
    year: number,
    locale = "th-TH",
): TrendLineSeries {
    const totals = new Map<number, { income: number; expense: number }>();

    for (const tx of transactions) {
        const d = dayjs(tx.txDate);
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
            dayjs().year(year).month(m).date(1).toDate().toLocaleDateString(locale, {
                month: "short",
            }),
        ),
        income: months.map((m) => totals.get(m)?.income ?? 0),
        expense: months.map((m) => totals.get(m)?.expense ?? 0),
    };
}

export function buildTrendLineFromTransactions(
    transactions: Transaction[],
    filter: AnalyticFilter,
    locale = "th-TH",
): TrendLineSeries {
    const now = dayjs();
    const start = filterStart(filter, now);
    const end = now.endOf("day");

    const totals = new Map<string, { income: number; expense: number }>();

    for (const tx of transactions) {
        const d = dayjs(tx.txDate);
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
        labels: keys.map((k) => formatLabel(k, filter, locale)),
        income: keys.map((k) => totals.get(k)?.income ?? 0),
        expense: keys.map((k) => totals.get(k)?.expense ?? 0),
    };
}
