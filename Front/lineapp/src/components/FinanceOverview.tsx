import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronRight } from "react-icons/fi";
import { LuEye, LuEyeOff } from "react-icons/lu";

type FinanceOverviewProps = {
    income: number;
    expense: number;
    balance: number;
};

function formatAmount(value: number, visible: boolean): string {
    if (!visible) return "•••••";
    return value.toLocaleString();
}

export default function FinanceOverview({ income, expense, balance }: FinanceOverviewProps) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(true);
    const balanceTone = balance < 0 ? "negative" : "positive";

    return (
        <section className="finance-summary" aria-label={t("sum.financeOverview")}>
            <div className="finance-summary-header">
                <h2 className="finance-summary-title">{t("sum.financeOverview")}</h2>
                <div className="finance-summary-actions">
                    <button
                        type="button"
                        className="finance-summary-visibility-btn"
                        onClick={() => setVisible((prev) => !prev)}
                        aria-label={visible ? t("sum.hideBalance") : t("sum.showBalance")}
                    >
                        {visible ? <LuEye size={16} aria-hidden /> : <LuEyeOff size={16} aria-hidden />}
                    </button>
                    <Link
                        to="/analytics"
                        className="finance-summary-next"
                        aria-label={t("sum.viewAnalyticsAria")}
                    >
                        <FiChevronRight size={18} aria-hidden />
                    </Link>
                </div>
            </div>

            <div className={`finance-summary-hero finance-summary-hero--${balanceTone}`}>
                <p className="finance-summary-hero-value">{formatAmount(balance, visible)}</p>
                <p className="finance-summary-hero-label">{t("sum.totalBalance")}</p>
            </div>

            <div className="finance-summary-stats">
                <article className="finance-summary-stat finance-summary-stat--income">
                    <p className="finance-summary-stat-label">{t("sum.totalIncome")}</p>
                    <p className="finance-summary-stat-value">{formatAmount(income, visible)}</p>
                </article>
                <article className="finance-summary-stat finance-summary-stat--expense">
                    <p className="finance-summary-stat-label">{t("sum.totalExpense")}</p>
                    <p className="finance-summary-stat-value">{formatAmount(expense, visible)}</p>
                </article>
            </div>
        </section>
    );
}
