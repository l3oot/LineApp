type FilterChipButtonProps = {
    label: string;
    active: boolean;
    activeClassName: string;
    onClick: () => void;
};

export default function FilterChipButton({ label, active, activeClassName, onClick }: FilterChipButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-[var(--radius-control)] border px-4 py-1 text-sm font-semibold transition-all ${active
                ? activeClassName
                : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)] hover:bg-[var(--surface)]"
                }`}
        >
            {label}
        </button>
    );
}
