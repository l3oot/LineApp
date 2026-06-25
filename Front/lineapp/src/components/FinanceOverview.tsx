import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LuEye, LuEyeOff } from "react-icons/lu";
import StatisticGrowIcon from "./icons/StatisticGrowIcon";

type FinanceOverviewProps = {
    income: number;
    expense: number;
    balance: number;
};

export default function FinanceOverview({ income, expense, balance }: FinanceOverviewProps) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(true);

    const formatAmount = (value: number) => (visible ? value.toLocaleString() : "•••••");

    return (
        <section className="finance-overview-card" aria-label={t("sum.financeOverview")}>
            <div className="finance-overview-top">
                <div className="finance-overview-income">
                    <span className="finance-overview-illus-slot" aria-hidden />
                    <div className="finance-overview-metric">
                        <p className="finance-overview-label finance-overview-label--income">
                            {t("sum.totalIncome")}
                        </p>
                        <p className="finance-overview-amount finance-overview-amount--income">
                            {formatAmount(income)}
                        </p>
                    </div>
                </div>

                <div className="finance-overview-expense">
                    <div className="finance-overview-metric finance-overview-metric--end">
                        <p className="finance-overview-label finance-overview-label--expense">
                            {t("sum.totalExpense")}
                        </p>
                        <p className="finance-overview-amount finance-overview-amount--expense">
                            {formatAmount(expense)}
                        </p>
                    </div>
                    <span className="finance-overview-illus-slot" aria-hidden />
                </div>

                <div className="finance-overview-center" aria-hidden>
                    <div className="finance-overview-icon-ring">
                        <StatisticGrowIcon color="#5BB35F" className="h-6 w-6" />
                    </div>
                </div>
            </div>

            <div className="finance-overview-bottom">
                <p className="finance-overview-label finance-overview-label--balance">
                    {t("sum.totalBalance")}
                </p>
                <div className="finance-overview-balance-row">
                    <p className="finance-overview-balance-amount">{formatAmount(balance)}</p>
                    <button
                        type="button"
                        className="finance-overview-visibility-btn"
                        onClick={() => setVisible((prev) => !prev)}
                        aria-label={visible ? t("sum.hideBalance") : t("sum.showBalance")}
                    >
                        {visible ? <LuEye size={16} aria-hidden /> : <LuEyeOff size={16} aria-hidden />}
                    </button>
                </div>
            </div>
        </section>
    );
}
