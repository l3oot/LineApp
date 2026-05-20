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
    icon: IconName;
    onEdit?: () => void;
    onDelete?: () => void;
    deleting?: boolean;
}

export default function Addcycle({
    title,
    income,
    expense,
    length,
    budget,
    icon,
    onEdit,
    onDelete,
    deleting = false,
}: AddcycleProps) {
    const { t } = useTranslation();
    const capital = budget ?? 0;
    const remaining = capital - (expense - income);
    const budgetBase = capital > 0 ? capital : income;
    const percent = calpercentused(expense, budgetBase);
    const remainingColor = remaining >= 0 ? "var(--primary)" : "var(--danger)";
    const bgcolor = calbgcolor(percent);
    const PnL = calPnL(percent);
    const safePercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
    const displayPercent = Number.isFinite(percent) ? percent : 0;

    return (
        <div
            className="w-full p-5 border rounded-[var(--radius-card)] transition-all shadow-[var(--shadow-soft)]"
            style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                borderWidth: "1px",
                borderStyle: "solid"
            }}
        >
            <div className="flex flex-row justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full text-3xl bg-[var(--surface-soft)]">
                        {icons[icon]}
                    </div>
                    <h1 className='text-2xl font-bold text-[var(--text)]'>{title}</h1>
                </div>
                <div style={{ backgroundColor: bgcolor }} className="rounded-full px-3 py-1 flex items-center justify-center shadow-sm">
                    <p className="text-white text-xs font-bold">{t(`pnl.${PnL}`)}</p>
                </div>

            </div>
            <div className="mt-0.5">
                <p className='text-sm text-[var(--text-soft)] font-medium'>{length}</p>
            </div>
            <div className="mt-3 flex bg-white/60 backdrop-blur-sm border border-[var(--border)] rounded-[16px] overflow-hidden shadow-inner">
                <div className="flex-1 p-2 text-center">
                    <p className="text-xs text-[var(--text-soft)]">{t("addcycle.capital")}</p>
                    <p className="font-bold text-[#2d6fbe]">{capital.toLocaleString()}</p>
                </div>
                <div className="flex-1 border-l border-[var(--border)] p-2 text-center">
                    <p className="text-xs text-[var(--text-soft)]">{t("addcycle.incomeExpense")}</p>
                    <p className="mt-0.5 text-sm font-bold text-[var(--text)]">
                        <span className="text-[var(--primary)]">{income.toLocaleString()}</span>
                        <span className="mx-1 text-[var(--text-soft)]">-</span>
                        <span className="text-[var(--danger)]">{expense.toLocaleString()}</span>
                    </p>
                </div>
                <div className="flex-1 border-l border-[var(--border)] p-2 text-center">
                    <p className="text-xs text-[var(--text-soft)]">{t("addcycle.remaining")}</p>
                    <p className="font-bold" style={{ color: remainingColor }}>
                        {remaining.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="w-full mt-4">
                <div className="w-full h-2 bg-[#d6ddd2] rounded-full">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${safePercent}%`,
                            backgroundColor: bgcolor
                        }}
                    />
                </div>
            </div>
            <div className="mt-1 w-full flex flex-row mb-1 items-center justify-between">
                <p className="text-xs font-bold text-[var(--text-soft)]">{t("addcycle.usedBudget")}</p>
                <p className='text-xs font-bold' style={{ color: bgcolor }}>{displayPercent.toFixed(0)}%</p>
            </div>
            <hr className="border-[var(--border)] mt-3 mb-3" />
            <div className="flex flex-row justify-end gap-3">
                <button
                    type="button"
                    disabled={deleting}
                    onClick={onEdit}
                    className="bg-white/70 text-[var(--text-soft)] font-bold text-xs py-1.5 px-6 rounded-[var(--radius-control)] border border-[var(--border)] hover:bg-white hover:shadow-sm transition-all disabled:opacity-50"
                >
                    {t("addcycle.edit")}
                </button>
                <button
                    type="button"
                    disabled={deleting}
                    onClick={onDelete}
                    className="bg-red-50 text-[var(--danger)] font-bold text-xs py-1.5 px-6 rounded-[var(--radius-control)] border border-red-100 hover:bg-red-100 hover:shadow-sm transition-all disabled:opacity-50"
                >
                    {deleting ? "..." : t("addcycle.delete")}
                </button>
            </div>
        </div>
    );
}