import type { Transaction } from "../lib/userService";
import { parseTxDateTime } from "./parseTxDateTime";
import {
    activeSeasonStartYear,
    isInSeasonWindow,
    seasonWindowForYear,
} from "./seasonWindows";

export type CycleFinancialStats = {
    income: number;
    expense: number;
};

export function aggregateTransactionsByCycle(
    transactions: Transaction[],
): Record<string, CycleFinancialStats> {
    const map: Record<string, CycleFinancialStats> = {};
    for (const tx of transactions) {
        if (!tx.cycleId) continue;
        const bucket = map[tx.cycleId] ?? { income: 0, expense: 0 };
        const amount = Number(tx.amount);
        if (Number.isNaN(amount)) continue;
        if (tx.txType === "income") {
            bucket.income += amount;
        } else if (tx.txType === "expense") {
            bucket.expense += amount;
        }
        map[tx.cycleId] = bucket;
    }
    return map;
}

/** สรุปรายรับ-รายจ่ายของรอบปีเดียว (กรองตาม cycleId + ช่วงวันของรอบถ้ามี) */
export function statsForSeason(
    transactions: Transaction[],
    season:
        | {
              cycleId: string;
              startDate?: string | null;
              endDate?: string | null;
          }
        | null
        | undefined,
): CycleFinancialStats {
    if (!season?.cycleId) return { income: 0, expense: 0 };

    const startMs = season.startDate ? Date.parse(`${season.startDate}T00:00:00`) : Number.NaN;
    const endMs = season.endDate ? Date.parse(`${season.endDate}T23:59:59.999`) : Number.NaN;
    const hasStart = Number.isFinite(startMs);
    const hasEnd = Number.isFinite(endMs);

    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
        if (tx.cycleId !== season.cycleId) continue;
        if (hasStart || hasEnd) {
            const txMs = parseTxDateTime(tx.txDate).getTime();
            if (Number.isNaN(txMs)) continue;
            if (hasStart && txMs < startMs) continue;
            if (hasEnd && txMs > endMs) continue;
        }
        const amount = Number(tx.amount);
        if (Number.isNaN(amount)) continue;
        if (tx.txType === "income") income += amount;
        else if (tx.txType === "expense") expense += amount;
    }
    return { income, expense };
}

/** สรุปรายรับ-รายจ่ายของรอบปีตามเดือนที่พืชเลือก ไม่ต้องเปิดฤดูกาลใหม่เอง */
export function statsForCropRound(
    crop: {
        startMonth: number | null;
        endMonth: number | null;
        currentSeason?: {
            cycleId: string;
            startDate?: string | null;
            endDate?: string | null;
        } | null;
    },
    transactions: Transaction[],
    cycleIds: Iterable<string> = [],
): CycleFinancialStats {
    if (crop.startMonth == null || crop.endMonth == null) {
        return statsForSeason(transactions, crop.currentSeason);
    }

    const ids = new Set(cycleIds);
    if (crop.currentSeason?.cycleId) ids.add(crop.currentSeason.cycleId);
    const window = seasonWindowForYear(
        crop.startMonth,
        crop.endMonth,
        activeSeasonStartYear(crop.startMonth, crop.endMonth),
    );

    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
        if (!tx.cycleId || !ids.has(tx.cycleId)) continue;
        if (!isInSeasonWindow(parseTxDateTime(tx.txDate), window.startDate, window.endDate)) {
            continue;
        }
        const amount = Number(tx.amount);
        if (Number.isNaN(amount)) continue;
        if (tx.txType === "income") income += amount;
        else if (tx.txType === "expense") expense += amount;
    }
    return { income, expense };
}

export function seasonRemaining(income: number, expense: number): number {
    return income - expense;
}
