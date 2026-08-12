import type { CalendarDate, Time } from "@internationalized/date";
import {
    Button,
    Calendar,
    CalendarCell,
    CalendarGrid,
    CalendarGridBody,
    CalendarGridHeader,
    CalendarHeaderCell,
    DateInput,
    DatePicker,
    DateSegment,
    Dialog,
    Group,
    Heading,
    Popover,
    TimeField,
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

const segmentClassName =
    "inline-block min-w-[1.25rem] rounded-sm px-0 text-center tabular-nums outline-none focus:bg-[var(--primary-soft)]";
const timeInputClassName =
    "inline-flex h-[2.375rem] w-[5.75rem] shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold tabular-nums text-[var(--text)] focus-within:border-[var(--primary)]";

export default function AppDateTimeField({
    date,
    time,
    onDateChange,
    onTimeChange,
    ariaLabel,
    className = "",
}: AppDateTimeFieldProps) {
    const { i18n } = useTranslation();

    const focusTimeSegmentOnPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const isMouseClick = event.pointerType === "mouse" && event.button === 0;
        const isTouchTap = event.pointerType === "touch";

        if (!isMouseClick && !isTouchTap) return;

        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const clickedSegment = target.closest("[role='spinbutton']");
        const firstSegment = event.currentTarget.querySelector("[role='spinbutton']");
        const segmentToFocus = clickedSegment ?? firstSegment;

        if (!(segmentToFocus instanceof HTMLElement)) return;

        if (document.activeElement !== segmentToFocus) {
            if (isMouseClick) {
                event.preventDefault();
            }
            segmentToFocus.focus();
        }
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
                <Popover className="z-40 mt-2 w-[var(--trigger-width)] min-w-[280px] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft)]">
                    <Dialog className="outline-none">
                        <Calendar className="w-full">
                            <header className="mb-2 flex items-center justify-between">
                                <Button slot="previous" className="rounded-full px-2 py-1 text-sm text-[var(--text-soft)] hover:bg-[var(--surface-soft)]">
                                    ‹
                                </Button>
                                <Heading className="text-sm font-bold text-[var(--text)]" />
                                <Button slot="next" className="rounded-full px-2 py-1 text-sm text-[var(--text-soft)] hover:bg-[var(--surface-soft)]">
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

            <TimeField
                aria-label={ariaLabel}
                value={time}
                onChange={(value) => {
                    if (value) onTimeChange(value);
                }}
                hourCycle={24}
                shouldForceLeadingZeros
                className="w-[5.75rem] shrink-0"
            >
                <DateInput className={timeInputClassName} onPointerDown={focusTimeSegmentOnPointerDown}>
                    {(segment) => (
                        <DateSegment
                            segment={segment}
                            className={
                                segment.type === "literal"
                                    ? "inline-block min-w-[0.375rem] text-center tabular-nums"
                                    : segmentClassName
                            }
                        />
                    )}
                </DateInput>
            </TimeField>
        </div>
    );
}

export const initialAppDateTime = createInitialAppDateTime;
