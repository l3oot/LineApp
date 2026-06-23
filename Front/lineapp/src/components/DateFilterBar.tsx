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
import { formatCalendarDateSlash } from "../utils/formatAppDate";

type SingleDatePickerFieldProps = {
  label: string;
  ariaLabel: string;
  value: CalendarDate;
  onChange: (date: CalendarDate) => void;
};

function SingleDatePickerField({ label, ariaLabel, value, onChange }: SingleDatePickerFieldProps) {
  const { i18n } = useTranslation();

  return (
    <DatePicker
      aria-label={ariaLabel}
      value={value}
      onChange={(nextValue) => {
        if (nextValue) onChange(nextValue);
      }}
      className="home-date-range-field-picker"
    >
      <Group className="home-date-range-field">
        <Button
          aria-label={ariaLabel}
          className="date-range-trigger-btn absolute inset-0 z-10 rounded-full"
        />
        <span className="home-date-range-field-label pointer-events-none">{label}</span>
        <div className="home-date-range-field-input pointer-events-none">
          <span className="home-date-range-field-value truncate">
            {formatCalendarDateSlash(value, i18n.language)}
          </span>
          <FiCalendar className="home-date-range-field-icon" aria-hidden />
        </div>
      </Group>
      <Popover className="z-30 mt-2 w-[var(--trigger-width)] min-w-[280px] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft)]">
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
  );
}

export type DateFilterBarProps = {
  startDate: CalendarDate;
  endDate: CalendarDate;
  onStartDateChange: (date: CalendarDate) => void;
  onEndDateChange: (date: CalendarDate) => void;
  dateFromLabel: string;
  dateToLabel: string;
  dateFromAria: string;
  dateToAria: string;
  className?: string;
};

export default function DateFilterBar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  dateFromLabel,
  dateToLabel,
  dateFromAria,
  dateToAria,
  className = "",
}: DateFilterBarProps) {
  const handleStartDateChange = (date: CalendarDate) => {
    onStartDateChange(date);
    if (date.compare(endDate) > 0) {
      onEndDateChange(date);
    }
  };

  const handleEndDateChange = (date: CalendarDate) => {
    onEndDateChange(date);
    if (date.compare(startDate) < 0) {
      onStartDateChange(date);
    }
  };

  return (
    <div className={`home-date-range w-full ${className}`.trim()}>
      <div className="home-date-range-leading" aria-hidden>
        <FiCalendar className="home-date-range-leading-icon" />
      </div>
      <div className="home-date-range-fields">
        <div className="flex min-w-0 flex-1 items-end gap-1.5 sm:gap-2">
          <SingleDatePickerField
            label={dateFromLabel}
            ariaLabel={dateFromAria}
            value={startDate}
            onChange={handleStartDateChange}
          />
          <span className="home-date-range-sep" aria-hidden>
            ~
          </span>
          <SingleDatePickerField
            label={dateToLabel}
            ariaLabel={dateToAria}
            value={endDate}
            onChange={handleEndDateChange}
          />
        </div>
      </div>
    </div>
  );
}
