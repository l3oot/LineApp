import { FiChevronRight } from "react-icons/fi";

type SettingActionRowProps = {
    label: string;
    value?: string;
    danger?: boolean;
    lineTone?: boolean;
    disabled?: boolean;
    onClick?: () => void;
};

export default function SettingActionRow({
    label,
    value,
    danger = false,
    lineTone = false,
    disabled = false,
    onClick,
}: SettingActionRowProps) {
    const textColor = danger ? "text-[var(--danger)]" : lineTone ? "text-[#03C755]" : "text-[var(--text)]";
    const iconColor = danger ? "text-[var(--danger)]" : lineTone ? "text-[#03C755]" : "text-[var(--text-soft)]";
    const valueColor = danger ? "text-[var(--danger)]" : lineTone ? "text-[#03C755]" : "text-[var(--text-soft)]";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex min-h-[48px] w-full items-center justify-between rounded-[var(--radius-card)] border-0 bg-[var(--surface)] px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-all hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
            <p className={`text-[14px] font-medium md:text-[15px] ${textColor}`}>{label}</p>
            <div className="flex items-center gap-1.5">
                {value && <span className={`text-[14px] md:text-[15px] ${valueColor}`}>{value}</span>}
                <FiChevronRight className={iconColor} size={16} />
            </div>
        </button>
    );
}
