import { useState } from "react";
import { FiX } from "react-icons/fi";
import { FaPlus } from "react-icons/fa";
import { useTranslation } from "react-i18next";

type CategoryCenterModalProps = {
    open: boolean;
    onClose: () => void;
};

export default function CategoryCenterModal({ open, onClose }: CategoryCenterModalProps) {
    const { t } = useTranslation();
    const [activeType, setActiveType] = useState<"income" | "expense">("income");
    const incomeCategories = [
        t("settings.categorySheet.mockIncome.cropSales"),
        t("settings.categorySheet.mockIncome.sideJob"),
        t("settings.categorySheet.mockIncome.livestock"),
        t("settings.categorySheet.mockIncome.other"),
    ];
    const expenseCategories = [
        t("settings.categorySheet.mockExpense.fertilizer"),
        t("settings.categorySheet.mockExpense.seed"),
        t("settings.categorySheet.mockExpense.labor"),
        t("settings.categorySheet.mockExpense.other"),
    ];
    const activeCategories = activeType === "income" ? incomeCategories : expenseCategories;
    const isIncomeType = activeType === "income";

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/35 px-4" onClick={onClose}>
            <div
                className="mx-auto mt-[22vh] w-full max-w-[420px] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-base font-bold text-[var(--text)]">{t("settings.categorySheet.title")}</p>
                    <button
                        type="button"
                        aria-label={t("common.close")}
                        onClick={onClose}
                        className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveType("income")}
                        className={`rounded-[var(--radius-control)] border px-3 py-2 text-center text-sm font-semibold transition-all ${
                            activeType === "income"
                                ? "border-2 border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                                : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)]"
                        }`}
                    >
                        {t("settings.categorySheet.income")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveType("expense")}
                        className={`rounded-[var(--radius-control)] border px-3 py-2 text-center text-sm font-semibold transition-all ${
                            activeType === "expense"
                                ? "border-2 border-[var(--danger)] bg-red-100 text-[var(--danger)]"
                                : "border-red-100 bg-red-50 text-[var(--danger)] hover:bg-red-100"
                        }`}
                    >
                        {t("settings.categorySheet.expense")}
                    </button>
                </div>
                <button
                    type="button"
                    className={`group mt-2 flex w-full items-center justify-center rounded-[var(--radius-control)] border-2 border-dashed px-3 py-2 transition-all hover:scale-[1.01] active:scale-95 ${
                        isIncomeType
                            ? "border-[var(--primary)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                            : "border-red-200 bg-[var(--surface)] hover:border-[var(--danger)] hover:bg-red-50"
                    }`}
                >
                    <FaPlus
                        size={12}
                        className={`transition-transform group-hover:rotate-90 ${
                            isIncomeType ? "text-[var(--primary)]" : "text-[var(--danger)]"
                        }`}
                    />
                    <p className={`ml-2 font-bold ${isIncomeType ? "text-[var(--primary)]" : "text-[var(--danger)]"}`}>
                        {activeType === "income"
                            ? t("settings.categorySheet.addIncome")
                            : t("settings.categorySheet.addExpense")}
                    </p>
                </button>
                <div className="mt-2 rounded-[var(--radius-control)] bg-[var(--surface)]">
                    <ul className="m-0 list-none space-y-1.5 p-0 text-sm">
                        {activeCategories.map((item) => (
                            <li
                                key={item}
                                className={`flex w-full items-center justify-between rounded-[10px] border bg-[var(--surface)] px-2.5 py-1 text-[var(--text)] ${
                                    isIncomeType ? "border-[var(--primary)]" : "border-red-200"
                                }`}
                            >
                                <span>{item}</span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--text-soft)] transition-all hover:bg-[var(--surface)]"
                                    >
                                        {t("addcycle.edit")}
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-[8px] border border-red-100 px-2 py-0.5 text-xs font-semibold text-[var(--danger)] transition-all hover:bg-red-50"
                                    >
                                        {t("addcycle.delete")}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
