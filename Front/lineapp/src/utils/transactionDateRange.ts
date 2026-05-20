import type { CalendarDate } from "@internationalized/date";
import type { Transaction } from "../lib/userService";

export function calendarDateStart(cd: CalendarDate): Date {
    return new Date(cd.year, cd.month - 1, cd.day, 0, 0, 0, 0);
}

export function calendarDateEnd(cd: CalendarDate): Date {
    return new Date(cd.year, cd.month - 1, cd.day, 23, 59, 59, 999);
}

export function isTxInDateRange(txDate: string, start: CalendarDate, end: CalendarDate): boolean {
    const d = new Date(txDate);
    if (Number.isNaN(d.getTime())) return false;
    return d >= calendarDateStart(start) && d <= calendarDateEnd(end);
}

export function filterTransactionsInRange(
    transactions: Transaction[],
    start: CalendarDate,
    end: CalendarDate,
): Transaction[] {
    return transactions.filter((tx) => isTxInDateRange(tx.txDate, start, end));
}

export function sumTransactionTotals(transactions: Transaction[]): {
    income: number;
    expense: number;
    balance: number;
} {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
        const amount = Number(tx.amount);
        if (Number.isNaN(amount)) continue;
        if (tx.txType === "income") income += amount;
        else if (tx.txType === "expense") expense += amount;
    }
    return { income, expense, balance: income - expense };
}
