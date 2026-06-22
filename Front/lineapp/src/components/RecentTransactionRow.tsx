type RecentTransactionRowProps = {
    title: string;
    category: string;
    amount: number;
    type: "income" | "expense";
    timeLabel: string;
    icon?: string;
};

export default function RecentTransactionRow({
    title,
    category,
    amount,
    type,
    timeLabel,
    icon,
}: RecentTransactionRowProps) {
    const isIncome = type === "income";
    const sign = isIncome ? "+" : "-";

    return (
        <div className="recent-tx-row">
            <div className="recent-tx-icon" aria-hidden>
                {icon ? <span className="recent-tx-icon-emoji">{icon}</span> : <span className="recent-tx-icon-placeholder" />}
            </div>

            <div className="recent-tx-body">
                <p className="recent-tx-title">{title}</p>
                <p className="recent-tx-category">{category}</p>
            </div>

            <div className="recent-tx-meta">
                <p className={`recent-tx-amount ${isIncome ? "recent-tx-amount--income" : "recent-tx-amount--expense"}`}>
                    {sign}{amount.toLocaleString()}
                </p>
                <p className="recent-tx-time">{timeLabel}</p>
            </div>
        </div>
    );
}
