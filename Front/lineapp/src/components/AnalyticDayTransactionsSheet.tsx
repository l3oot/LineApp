import type { CalendarDate } from "@internationalized/date";
import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import BottomSheet from "./BottomSheet";
import TransactionCard from "./TransactionCard";
import type { Transaction } from "../lib/userService";
import { formatCalendarDate, intlLocaleForAppLanguage } from "../utils/formatAppDate";
import { formatTxTime } from "../utils/parseTxDateTime";
import { icons } from "../assets/Iconlist";
import { resolveTxIconEmoji } from "../utils/resolveTxIcon";

type AnalyticDayTransactionsSheetProps = {
    open: boolean;
    date: CalendarDate | null;
    transactions: Transaction[];
    categoryById: Record<string, string>;
    incomeTotal: number;
    expenseTotal: number;
    onRequestClose: () => void;
    onClosed: () => void;
};

export default function AnalyticDayTransactionsSheet({
    open,
    date,
    transactions,
    categoryById,
    incomeTotal,
    expenseTotal,
    onRequestClose,
    onClosed,
}: AnalyticDayTransactionsSheetProps) {
    const { t, i18n } = useTranslation();
    const fallbackCategory = t("list.quickAddCategory");
    const dateLabel = date ? formatCalendarDate(date, i18n.language) : "";

    return (
        <BottomSheet
            open={open}
            onRequestClose={onRequestClose}
            onClose={onClosed}
            panelClassName="flex max-h-[min(85vh,640px)] flex-col px-4 pb-4"
        >
            {date ? (
                <>
                    <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-[var(--text)]">{dateLabel}</h3>
                            <p className="mt-1 text-sm text-[var(--text-soft)]">
                                {t("analytic.daySummary", {
                                    income: incomeTotal.toLocaleString(),
                                    expense: expenseTotal.toLocaleString(),
                                })}
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-label={t("common.close")}
                            onClick={onRequestClose}
                            className="shrink-0 rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {transactions.length === 0 ? (
                            <p className="py-8 text-center text-sm text-[var(--text-soft)]">
                                {t("analytic.dayEmpty")}
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2 pb-2">
                                {transactions.map((tx) => (
                                    <TransactionCard
                                        key={tx.txId}
                                        title={tx.note?.trim() || "—"}
                                        type={tx.txType}
                                        category={
                                            tx.categoryId
                                                ? (categoryById[tx.categoryId] ?? fallbackCategory)
                                                : fallbackCategory
                                        }
                                        amount={Number(tx.amount)}
                                        time={formatTxTime(tx.txDate, intlLocaleForAppLanguage(i18n.language))}
                                        icon={resolveTxIconEmoji(tx.icon, icons.bill)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : null}
        </BottomSheet>
    );
}
