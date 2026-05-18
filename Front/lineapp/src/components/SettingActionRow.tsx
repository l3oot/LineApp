import { FiChevronRight } from "react-icons/fi";

type SettingActionRowProps = {
    label: string;
    value?: string;
    danger?: boolean;
    onClick?: () => void;
};

export default function SettingActionRow({ label, value, danger = false, onClick }: SettingActionRowProps) {
    const textColor = danger ? "text-[var(--danger)]" : "text-[var(--text)]";
    const iconColor = danger ? "text-[var(--danger)]" : "text-[var(--text-soft)]";
    const valueColor = danger ? "text-[var(--danger)]" : "text-[var(--text-soft)]";

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex min-h-[40px] w-full items-center justify-between rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left transition-all hover:bg-[var(--surface-soft)]"
        >
            <p className={`text-[14px] font-medium md:text-[15px] ${textColor}`}>{label}</p>
            <div className="flex items-center gap-1.5">
                {value && <span className={`text-[14px] md:text-[15px] ${valueColor}`}>{value}</span>}
                <FiChevronRight className={iconColor} size={16} />
            </div>
        </button>
    );
}
