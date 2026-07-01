import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Transaction } from "../lib/userService";
import { resolveTxIconEmoji } from "../utils/resolveTxIcon";
import ListTransactionRow from "./ListTransactionRow";

type ListDayTypeCardProps = {
    date: string;
    transactions: Transaction[];
    collapsed: boolean;
    onToggle: () => void;
    categoryById: Record<string, string>;
    fallbackCategory: string;
    fallbackIcon?: string;
    selectable?: boolean;
    selectedTxIds: string[];
    onToggleSelect: (txId: string, selected: boolean) => void;
    onEdit: (tx: Transaction) => void;
};

function netTotalForTransactions(transactions: Transaction[]): number {
    return transactions.reduce((sum, tx) => {
        const amount = Number(tx.amount);
        if (Number.isNaN(amount)) return sum;
        return tx.txType === "income" ? sum + amount : sum - amount;
    }, 0);
}

export default function ListDayTypeCard({
    date,
    transactions,
    collapsed,
    onToggle,
    categoryById,
    fallbackCategory,
    fallbackIcon,
    selectable = false,
    selectedTxIds,
    onToggleSelect,
    onEdit,
}: ListDayTypeCardProps) {
    const { t } = useTranslation();
    const netTotal = useMemo(() => netTotalForTransactions(transactions), [transactions]);
    const isPositive = netTotal >= 0;
    const countLabel = t("list.itemCount", { count: transactions.length });
    const totalSign = isPositive ? "+" : "-";

    return (
        <section
            className={`list-day-card${isPositive ? " list-day-card--income" : " list-day-card--expense"}`}
        >
            <button
                type="button"
                className="list-day-card-header"
                onClick={onToggle}
                aria-expanded={!collapsed}
            >
                <span className="list-day-card-date">{date}</span>
                <span className="list-day-card-summary">
                    <span className="list-day-card-count">{countLabel}</span>
                    <span
                        className={`list-day-card-total${isPositive ? " list-day-card-total--income" : " list-day-card-total--expense"}`}
                    >
                        {totalSign}{Math.abs(netTotal).toLocaleString()}
                    </span>
                    {collapsed ? (
                        <FiChevronDown size={18} className="list-day-card-chevron" aria-hidden />
                    ) : (
                        <FiChevronUp size={18} className="list-day-card-chevron" aria-hidden />
                    )}
                </span>
            </button>

            {!collapsed && (
                <div className="list-day-card-body">
                    {transactions.map((tx, index) => {
                        const category = tx.categoryId
                            ? (categoryById[tx.categoryId] ?? fallbackCategory)
                            : fallbackCategory;
                        return (
                            <div
                                key={tx.txId}
                                className={index < transactions.length - 1 ? "list-tx-row-divider" : undefined}
                            >
                                <ListTransactionRow
                                    title={tx.note?.trim() || "—"}
                                    type={tx.txType}
                                    subtitle={category}
                                    amount={Number(tx.amount)}
                                    icon={resolveTxIconEmoji(tx.icon, fallbackIcon)}
                                    selectable={selectable}
                                    selected={selectedTxIds.includes(tx.txId)}
                                    onSelectedChange={(selected) => onToggleSelect(tx.txId, selected)}
                                    onEdit={selectable ? undefined : () => onEdit(tx)}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
