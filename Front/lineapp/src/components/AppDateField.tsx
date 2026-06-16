import type { CalendarDate } from "@internationalized/date";
import {
    Button,
    Calendar,
    CalendarCell,
    CalendarGrid,
    CalendarGridBody,
    CalendarGridHeader,
    CalendarHeaderCell,
    DatePicker,
    Dialog,
    Group,
    Heading,
    Popover,
} from "react-aria-components";
import { FiCalendar } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { formatCalendarDate } from "../utils/formatAppDate";

type AppDateFieldProps = {
    value: CalendarDate;
    onChange: (date: CalendarDate) => void;
    ariaLabel: string;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
};

export default function AppDateField({
    value,
    onChange,
    ariaLabel,
    isOpen,
    onOpenChange,
    className = "",
}: AppDateFieldProps) {
    const { i18n } = useTranslation();

    return (
        <DatePicker
            aria-label={ariaLabel}
            value={value}
            onChange={(nextValue) => {
                if (nextValue) onChange(nextValue);
            }}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            className={`mt-2 block w-full ${className}`}
        >
            <Group className="relative flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 focus-within:border-[var(--primary)]">
                <Button
                    aria-label={ariaLabel}
                    className="absolute inset-0 z-10 rounded-[var(--radius-control)]"
                />
                <span className="pointer-events-none min-w-0 flex-1 whitespace-nowrap text-sm font-semibold text-[var(--text)]">
                    {formatCalendarDate(value, i18n.language)}
                </span>
                <FiCalendar
                    size={18}
                    className="pointer-events-none shrink-0 text-[var(--text-soft)]"
                    aria-hidden
                />
            </Group>
            <Popover className="z-[70] mt-2 w-[var(--trigger-width)] min-w-[280px] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft)]">
                <Dialog className="outline-none">
                    <Calendar className="w-full">
                        <header className="mb-2 flex items-center justify-between">
                            <Button
                                slot="previous"
                                className="rounded-full px-2 py-1 text-sm text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                            >
                                ‹
                            </Button>
                            <Heading className="text-sm font-bold text-[var(--text)]" />
                            <Button
                                slot="next"
                                className="rounded-full px-2 py-1 text-sm text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                            >
                                ›
                            </Button>
                        </header>
                        <CalendarGrid className="w-full table-fixed border-separate border-spacing-1">
                            <CalendarGridHeader>
                                {(day) => (
                                    <CalendarHeaderCell className="pb-1 text-center text-xs font-semibold text-[var(--text-soft)]">
                                        {day}
                                    </CalendarHeaderCell>
                                )}
                            </CalendarGridHeader>
                            <CalendarGridBody>
                                {(cellDate) => (
                                    <CalendarCell
                                        date={cellDate}
                                        className="flex h-8 w-full items-center justify-center rounded-full text-sm text-[var(--text)] outline-none hover:bg-[var(--surface-soft)] data-[disabled]:text-gray-300 data-[outside-month]:text-gray-300 data-[selected]:bg-[var(--primary-soft)] data-[selected]:text-[var(--primary)] data-[selected]:font-semibold"
                                    />
                                )}
                            </CalendarGridBody>
                        </CalendarGrid>
                    </Calendar>
                </Dialog>
            </Popover>
        </DatePicker>
    );
}
