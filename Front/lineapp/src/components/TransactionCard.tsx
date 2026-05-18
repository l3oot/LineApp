import { useTranslation } from "react-i18next";

export interface TransactionProps {
    title: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    time?: string;
    icon?: string;
}

export default function TransactionCard({ title, type, category, amount, time, icon }: TransactionProps) {
    const { t } = useTranslation();
    const isIncome = type === 'income';
    const amountColor = isIncome ? 'text-[var(--primary)]' : 'text-[var(--danger)]';
    const sign = isIncome ? '+' : '-';

    return (
        <div className="flex flex-row justify-between items-center p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] transition-all hover:border-[#cfdac8]">
            <div className="flex flex-row gap-3 items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full text-2xl bg-[var(--surface-soft)]">
                    {icon || '💸'}
                </div>
                <div className="flex flex-col gap-1">
                    <p className="font-bold text-[var(--text)] text-base">{title}</p>
                    <div className="flex flex-row gap-1.5 items-center">
                        <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] leading-none font-bold ${isIncome ? 'bg-[var(--primary)] text-white' : 'bg-[var(--danger)] text-white'}`}>
                            {isIncome ? t("transaction.income") : t("transaction.expense")}
                        </span>
                        <span className="inline-flex h-6 items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 text-[11px] leading-none text-[var(--text-soft)]">{category}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end">
                <p className={`font-bold text-lg ${amountColor}`}>
                    {sign}{amount.toLocaleString()}
                </p>
                {time && <p className="text-[11px] text-[var(--text-soft)] mt-0.5">{time}</p>}
            </div>
        </div>
    );
}
