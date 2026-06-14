import { useEffect, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

type DropdownItem = {
    value: string;
    label?: string;
};

type DropdownProps = {
    label: string;
    data: DropdownItem[];
    value?: string;
    onValueChange?: (value: string) => void;
    minWidth?: number;
    margin?: number | string;
};

export default function Dropdown({
    label,
    data,
    value: valueProp,
    onValueChange,
    minWidth = 120,
    margin = 1,
}: DropdownProps) {
    const [open, setOpen] = useState(false);
    const [internal, setInternal] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);
    const controlled = valueProp !== undefined;
    const value = controlled ? valueProp : internal;

    useEffect(() => {
        if (!controlled && data[0]?.value && !internal) {
            setInternal(data[0].value);
        }
    }, [controlled, data, internal]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    const selectedItem = data.find((row) => row.value === value);
    const display = selectedItem?.label ?? value;
    const marginStyle = typeof margin === "number" ? `${margin * 8}px` : margin;

    const handleSelect = (next: string) => {
        if (!controlled) setInternal(next);
        onValueChange?.(next);
        setOpen(false);
    };

    return (
        <div ref={rootRef} className="relative" style={{ minWidth, margin: marginStyle }}>
            <button
                type="button"
                aria-label={label}
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => setOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-medium text-[var(--text)] shadow-[var(--shadow-soft)] transition-all hover:border-[var(--primary)]"
            >
                <span className="truncate">{display}</span>
                <FiChevronDown
                    size={16}
                    className={`shrink-0 text-[var(--text-soft)] transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open && (
                <div
                    role="listbox"
                    aria-label={label}
                    className="absolute right-0 top-[calc(100%+4px)] z-50 max-h-[180px] min-w-full overflow-y-auto rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]"
                >
                    {data.map((item) => {
                        const isSelected = item.value === value;
                        return (
                            <button
                                key={item.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handleSelect(item.value)}
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all ${
                                    isSelected
                                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                        : "text-[var(--text)] hover:bg-[var(--surface-soft)]"
                                }`}
                            >
                                <span className="whitespace-nowrap">{item.label ?? item.value}</span>
                                {isSelected && <FiCheck size={16} className="ml-2 shrink-0 text-[var(--text-soft)]" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
