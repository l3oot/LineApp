import type { GroupedTransaction } from "../data/listMockData";
import type { Transaction } from "../lib/userService";
import { formatAppDate, gregorianKeyFromCalendarDate, parseTxToGregorianCalendarDate } from "./formatAppDate";
import { parseTxDateTime } from "./parseTxDateTime";

export function groupTransactionsByDate(rows: Transaction[], lang: string): GroupedTransaction[] {
    const sorted = [...rows].sort(
        (a, b) => parseTxDateTime(b.txDate).getTime() - parseTxDateTime(a.txDate).getTime(),
    );
    const groups: GroupedTransaction[] = [];
    let currentDateKey = "";
    let currentDateLabel = "";
    let currentItems: Transaction[] = [];

    for (const tx of sorted) {
        const dateKey = gregorianKeyFromCalendarDate(parseTxToGregorianCalendarDate(tx.txDate));
        const dateLabel = formatAppDate(tx.txDate, lang);
        if (dateKey !== currentDateKey) {
            if (currentItems.length > 0) {
                groups.push({ date: currentDateLabel, transactions: currentItems });
            }
            currentDateKey = dateKey;
            currentDateLabel = dateLabel;
            currentItems = [tx];
        } else {
            currentItems.push(tx);
        }
    }
    if (currentItems.length > 0) {
        groups.push({ date: currentDateLabel, transactions: currentItems });
    }
    return groups;
}
