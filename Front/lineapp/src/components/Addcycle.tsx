import { useState } from "react";
import { FiCalendar, FiChevronRight, FiEdit2, FiTrash2 } from "react-icons/fi";
import { calpercentused, calbgcolor, calPnL } from "../utils/Sumfun";
import { useTranslation } from "react-i18next";
import { icons } from "../assets/Iconlist";

type IconName = keyof typeof icons;

type AddcycleProps = {
    title: string;
    income: number;
    expense: number;
    length: string;
    budget?: number | null;
    dateComeIn?: number | null;
    icon: IconName;
    onEdit?: () => void;
    onDelete?: () => void;
    onMore?: () => void;
    onSummarize?: () => void;
    deleting?: boolean;
};

export default function Addcycle({
    title,
    income,
    expense,
    length,
    budget,
    dateComeIn,
    icon,
    onEdit,
    onDelete,
    onMore,
    onSummarize,
    deleting = false,
}: AddcycleProps) {
    const { t } = useTranslation();
    const capital = budget ?? 0;
    const remaining = capital - (expense - income);
    const budgetBase = capital > 0 ? capital : income;
    const percent = calpercentused(expense, budgetBase);
    const bgcolor = calbgcolor(percent);
    const PnL = calPnL(percent);
    const safePercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
    const displayPercent = Number.isFinite(percent) ? percent : 0;
    const isEmptyBudget = safePercent === 0 && expense === 0;
    const [showBudgetPercent, setShowBudgetPercent] = useState(false);
    const percentLabel = `${displayPercent.toFixed(0)}%`;
    const percentColor = isEmptyBudget ? "var(--text-soft)" : bgcolor;

    return (
        <article className="cycle-card">
            <div className="cycle-card-top">
                <div className="cycle-card-icon-wrap">
                    <span className="cycle-card-icon">{icons[icon]}</span>
                </div>

                <div className="cycle-card-info">
                    <h2 className="cycle-card-title">{title}</h2>
                    <span
                        className={`cycle-card-status cycle-card-status--${PnL}`}
                    >
                        {t(`pnl.${PnL}`)}
                    </span>
                    <div className="flex flex-row items-center">
                        <p className="cycle-card-date">
                            <FiCalendar size={13} aria-hidden />
                            <span>{length}</span>
                        </p>
                        {typeof dateComeIn === "number" && (
                            <p className={`cycle-card-datecomein${dateComeIn < 0 ? " cycle-card-datecomein--overdue" : ""}`}>
                                {t("addcycle.dateComeIn", { days: dateComeIn })}
                            </p>
                        )}
                    </div>

                </div>

                <div className="cycle-card-actions">
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={onEdit}
                        className="cycle-card-action-btn cycle-card-action-btn--edit"
                    >
                        <FiEdit2 size={15} aria-hidden />
                        {t("addcycle.edit")}
                    </button>
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={onDelete}
                        className="cycle-card-action-btn cycle-card-action-btn--delete"
                    >
                        <FiTrash2 size={15} aria-hidden />
                        {deleting ? "..." : t("addcycle.delete")}
                    </button>
                </div>
            </div>

            <div className="cycle-card-stats">
                <div className="cycle-stat">
                    <span className="cycle-stat-icon cycle-stat-icon--capital cycle-stat-icon--filled" aria-hidden>
                        💵
                    </span>
                    <span className="cycle-stat-label">{t("addcycle.capital")}</span>
                    <span className="cycle-stat-value cycle-stat-value--capital">
                        {capital.toLocaleString()}
                    </span>
                </div>

                <div className="cycle-stat cycle-stat--income-expense">
                    <span className="cycle-stat-icon cycle-stat-icon--income-expense cycle-stat-icon--filled" aria-hidden>
                        🧮
                    </span>
                    <span className="cycle-stat-label">{t("addcycle.incomeExpense")}</span>
                    <span className="cycle-stat-value cycle-stat-value--flow">
                        {income.toLocaleString()}-{expense.toLocaleString()}
                    </span>
                </div>

                <div className="cycle-stat">
                    <span className="cycle-stat-icon cycle-stat-icon--remaining cycle-stat-icon--filled" aria-hidden>
                        👝
                    </span>
                    <span className="cycle-stat-label">{t("addcycle.remaining")}</span>
                    <span className="cycle-stat-value cycle-stat-value--remaining">
                        {remaining.toLocaleString()}
                    </span>
                </div>

                <div className="cycle-stat cycle-stat--budget">
                    <span
                        className={`cycle-stat-icon cycle-stat-icon--budget cycle-stat-icon--filled${isEmptyBudget ? " is-muted" : ""}`}
                        aria-hidden
                    >
                        📊
                    </span>
                    <span className="cycle-stat-label">{t("addcycle.usedBudget")}</span>
                    <div
                        className={`cycle-stat-progress${showBudgetPercent ? " is-active" : ""}`}
                        role="button"
                        tabIndex={0}
                        aria-label={percentLabel}
                        onClick={() => setShowBudgetPercent((visible) => !visible)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setShowBudgetPercent((visible) => !visible);
                            }
                        }}
                        onBlur={() => setShowBudgetPercent(false)}
                    >
                        <span
                            className="cycle-stat-progress-tip"
                            style={{ color: percentColor }}
                            aria-hidden={!showBudgetPercent}
                        >
                            {percentLabel}
                        </span>
                        <div className="cycle-stat-progress-track">
                            <div
                                className="cycle-stat-progress-fill"
                                style={{
                                    width: `${safePercent}%`,
                                    backgroundColor: isEmptyBudget ? "var(--border)" : bgcolor,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {(onSummarize || onMore) && (
                <div className={`cycle-card-footer${onSummarize && onMore ? "" : " cycle-card-footer--single"}`}>
                    {onSummarize && (
                        <button
                            type="button"
                            className="cycle-card-summary-btn"
                            onClick={onSummarize}
                            disabled={deleting}
                            aria-label={t("addcycle.summarizeAria", { name: title })}
                        >
                            {t("addcycle.summarize")}
                        </button>
                    )}
                    {onMore && (
                        <button
                            type="button"
                            className="cycle-card-more-btn"
                            onClick={onMore}
                            aria-label={t("addcycle.moreAria", { name: title })}
                        >
                            {t("addcycle.more")}
                            <FiChevronRight size={16} aria-hidden />
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}
