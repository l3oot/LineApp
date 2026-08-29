import { Time } from "@internationalized/date";
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
import { formatCalendarDate, initialAppDateTime as createInitialAppDateTime } from "../utils/formatAppDate";

type AppDateTimeFieldProps = {
    date: CalendarDate;
    time: Time;
    onDateChange: (date: CalendarDate) => void;
    onTimeChange: (time: Time) => void;
    ariaLabel: string;
    className?: string;
};

const timeInputClassName =
    "h-[2.375rem] w-[2.6rem] rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-1 py-2 text-center text-sm font-semibold tabular-nums text-[var(--text)] outline-none focus:border-[var(--primary)]";

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export default function AppDateTimeField({
    date,
    time,
    onDateChange,
    onTimeChange,
    ariaLabel,
    className = "",
}: AppDateTimeFieldProps) {
    const { i18n } = useTranslation();

    const handleHourChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextHour = Number(event.target.value);
        if (Number.isNaN(nextHour)) return;

        onTimeChange(new Time(clamp(nextHour, 0, 23), time.minute));
    };

    const handleMinuteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextMinute = Number(event.target.value);
        if (Number.isNaN(nextMinute)) return;

        onTimeChange(new Time(time.hour, clamp(nextMinute, 0, 59)));
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <DatePicker
                aria-label={ariaLabel}
                value={date}
                onChange={(value) => {
                    if (value) onDateChange(value);
                }}
                className="min-w-0 flex-1"
            >
                <Group className="relative flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 focus-within:border-[var(--primary)]">
                    <Button
                        aria-label={ariaLabel}
                        className="absolute inset-0 z-10 rounded-[var(--radius-control)]"
                    />
                    <span className="pointer-events-none min-w-0 flex-1 whitespace-nowrap text-sm font-semibold text-[var(--text)]">
                        {formatCalendarDate(date, i18n.language)}
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

            <div
                className="flex items-center gap-1"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
            >
                <input
                    aria-label={`${ariaLabel} hour`}
                    type="number"
                    min={0}
                    max={23}
                    inputMode="numeric"
                    value={String(time.hour).padStart(2, "0")}
                    onChange={handleHourChange}
                    className={timeInputClassName}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                />
                <span className="text-sm font-semibold text-[var(--text-soft)]">:</span>
                <input
                    aria-label={`${ariaLabel} minute`}
                    type="number"
                    min={0}
                    max={59}
                    inputMode="numeric"
                    value={String(time.minute).padStart(2, "0")}
                    onChange={handleMinuteChange}
                    className={timeInputClassName}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                />
            </div>
        </div>
    );
}

export const initialAppDateTime = createInitialAppDateTime;
