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
