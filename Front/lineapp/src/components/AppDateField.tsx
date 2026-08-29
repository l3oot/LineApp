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
            <Popover
                placement="bottom"
                offset={8}
                className="date-picker-popover"
            >
                <Dialog className="outline-none">
                    <Calendar className="w-full">
                        <header className="date-picker-calendar-header">
                            <Button slot="previous" className="date-picker-calendar-nav">
                                ‹
                            </Button>
                            <Heading className="date-picker-calendar-title" />
                            <Button slot="next" className="date-picker-calendar-nav">
                                ›
                            </Button>
                        </header>
                        <CalendarGrid className="date-picker-calendar-grid">
                            <CalendarGridHeader>
                                {(day) => (
                                    <CalendarHeaderCell className="date-picker-calendar-weekday">
                                        {day}
                                    </CalendarHeaderCell>
                                )}
                            </CalendarGridHeader>
                            <CalendarGridBody>
                                {(cellDate) => (
                                    <CalendarCell
                                        date={cellDate}
                                        className="date-picker-calendar-cell"
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
