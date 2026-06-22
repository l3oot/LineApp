import { FiEdit2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";

type ListTransactionRowProps = {
    title: string;
    type: "income" | "expense";
    subtitle: string;
    amount: number;
    icon?: string;
    selectable?: boolean;
    selected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
    onEdit?: () => void;
};

export default function ListTransactionRow({
    title,
    type,
    subtitle,
    amount,
    icon,
    selectable = false,
    selected = false,
    onSelectedChange,
    onEdit,
}: ListTransactionRowProps) {
    const { t } = useTranslation();
    const isIncome = type === "income";
    const sign = isIncome ? "+" : "-";
    const currency = t("list.currencySuffix");

    const row = (
        <div className={`list-tx-row${isIncome ? " list-tx-row--income" : " list-tx-row--expense"}`}>
            <div className="list-tx-icon-wrap" aria-hidden>
                <span className="list-tx-icon">{icon || "💸"}</span>
            </div>

            <div className="list-tx-body">
                <div className="list-tx-title-row">
                    <p className="list-tx-title">{title}</p>
                    <span
                        className={`list-tx-type-tag${isIncome ? " list-tx-type-tag--income" : " list-tx-type-tag--expense"}`}
                    >
                        {isIncome ? t("transaction.income") : t("transaction.expense")}
                    </span>
                </div>
                <p className="list-tx-subtitle">{subtitle}</p>
            </div>

            <div className="list-tx-amount-wrap">
                <p className={`list-tx-amount${isIncome ? " list-tx-amount--income" : " list-tx-amount--expense"}`}>
                    {sign}{amount.toLocaleString()} {currency}
                </p>
            </div>

            {onEdit && !selectable && (
                <button
                    type="button"
                    className={`list-tx-edit-btn${isIncome ? " list-tx-edit-btn--income" : " list-tx-edit-btn--expense"}`}
                    aria-label={t("list.editAria")}
                    onClick={onEdit}
                >
                    <FiEdit2 size={14} aria-hidden />
                </button>
            )}
        </div>
    );

    if (!selectable) {
        return row;
    }

    return (
        <div className={`list-tx-select-wrap${selected ? " is-selected" : ""}`}>
            <label className="list-tx-checkbox" onClick={(event) => event.stopPropagation()}>
                <input
                    type="checkbox"
                    className="list-round-checkbox"
                    checked={selected}
                    onChange={(event) => onSelectedChange?.(event.target.checked)}
                    aria-label={t("list.selectTransactionAria")}
                />
            </label>
            {row}
        </div>
    );
}
