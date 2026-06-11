import { useTranslation } from "react-i18next";
import { FiChevronRight } from "react-icons/fi";

export interface TransactionProps {
    title: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    time?: string;
    icon?: string;
    onOpen?: () => void;
    selectable?: boolean;
    selected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
}

const cardClassName =
    "flex w-full flex-row justify-between items-center p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] transition-all hover:border-[#cfdac8] text-left";

export default function TransactionCard({
    title,
    type,
    category,
    amount,
    time,
    icon,
    onOpen,
    selectable = false,
    selected = false,
    onSelectedChange,
}: TransactionProps) {
    const { t } = useTranslation();
    const isIncome = type === 'income';
    const amountColor = isIncome ? 'text-[var(--primary)]' : 'text-[var(--danger)]';
    const sign = isIncome ? '+' : '-';

    const content = (
        <>
            <div className="flex flex-row gap-3 items-center min-w-0">
                <div className="flex shrink-0 items-center justify-center w-10 h-10 rounded-full text-2xl bg-[var(--surface-soft)]">
                    {icon || '💸'}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                    <p className="font-bold text-[var(--text)] text-base truncate">{title}</p>
                    <div className="flex flex-row gap-1.5 items-center flex-wrap">
                        <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] leading-none font-bold ${isIncome ? 'bg-[var(--primary)] text-white' : 'bg-[var(--danger)] text-white'}`}>
                            {isIncome ? t("transaction.income") : t("transaction.expense")}
                        </span>
                        <span className="inline-flex h-6 items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 text-[11px] leading-none text-[var(--text-soft)]">{category}</span>
                    </div>
                </div>
            </div>
            <div className="flex shrink-0 flex-row items-center gap-2 ml-2">
                <div className="flex flex-col items-end">
                    <p className={`font-bold text-lg ${amountColor}`}>
                        {sign}{amount.toLocaleString()}
                    </p>
                    {time && <p className="text-[11px] text-[var(--text-soft)] mt-0.5">{time}</p>}
                </div>
                {onOpen && (
                    <FiChevronRight
                        size={22}
                        className="text-[var(--text-soft)]"
                        aria-hidden
                    />
                )}
            </div>
        </>
    );

    const card = onOpen ? (
        <button
            type="button"
            onClick={onOpen}
            aria-label={t("list.openDetailAria")}
            className={`${cardClassName} flex-1 cursor-pointer active:scale-[0.99] ${selectable && selected ? "border-[var(--danger)] bg-red-50" : ""}`}
        >
            {content}
        </button>
    ) : (
        <div className={`${cardClassName} flex-1 ${selectable && selected ? "border-[var(--danger)] bg-red-50" : ""}`}>
            {content}
        </div>
    );

    if (!selectable) {
        return card;
    }

    return (
        <div className="flex items-stretch gap-2">
            <label
                className="flex shrink-0 items-center px-1"
                onClick={(event) => event.stopPropagation()}
            >
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => onSelectedChange?.(event.target.checked)}
                    aria-label={t("list.selectTransactionAria")}
                    className="h-4 w-4 rounded border-[var(--border)] accent-[var(--danger)]"
                />
            </label>
            {card}
        </div>
    );
}
