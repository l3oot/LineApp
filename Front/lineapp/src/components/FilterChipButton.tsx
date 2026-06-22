export type FilterChipVariant = "all" | "income" | "expense";

type FilterChipButtonProps = {
    label: string;
    active: boolean;
    variant?: FilterChipVariant;
    onClick: () => void;
};

export default function FilterChipButton({
    label,
    active,
    variant = "all",
    onClick,
}: FilterChipButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`list-filter-chip${active ? ` list-filter-chip--active list-filter-chip--${variant}` : ""}`}
        >
            {label}
        </button>
    );
}
