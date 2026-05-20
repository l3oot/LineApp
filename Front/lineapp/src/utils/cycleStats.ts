import type { Transaction } from "../lib/userService";

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
