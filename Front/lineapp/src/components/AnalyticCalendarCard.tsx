import { type CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import {
    Button,
    Calendar,
    CalendarCell,
    CalendarGrid,
    CalendarGridBody,
    CalendarGridHeader,
    CalendarHeaderCell,
    Heading,
} from "react-aria-components";
import { useMemo, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "./Dropdown";
import "../styles/analytic.css";
import type { DailyTotals } from "../utils/buildAnalyticTrend";
import {
    gregorianKeyFromCalendarDate,
    intlDisplayLocaleForAppLanguage,
    toAppCalendarDate,
    toGregorianCalendarDate,
    usesBuddhistEra,
} from "../utils/formatAppDate";

const EMPTY_DAILY_TOTALS: DailyTotals = {
    income: 0,
    expense: 0,
    incomeCount: 0,
    expenseCount: 0,
};

/** ความสูงคงที่ — ปฏิทินแสดงได้ 5 หรือ 6 แถวต่อเดือน */
const WEEK_ROW_HEIGHT_PX = 58;
const WEEK_ROW_COUNT = 6;
const CALENDAR_GRID_MIN_HEIGHT_PX = WEEK_ROW_HEIGHT_PX * WEEK_ROW_COUNT + 24;

type AnalyticCalendarCardProps = {
    dailyTotals: Map<string, DailyTotals>;
    focusedDate: CalendarDate;
    onFocusedDateChange: (date: CalendarDate) => void;
    onDaySelect?: (date: CalendarDate) => void;
    loading?: boolean;
};

export default function AnalyticCalendarCard({
    dailyTotals,
    focusedDate,
    onFocusedDateChange,
    onDaySelect,
    loading = false,
}: AnalyticCalendarCardProps) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const focusedGregorian = toGregorianCalendarDate(focusedDate);

    const monthOptions = useMemo(
        () =>
            Array.from({ length: 12 }, (_, index) => {
                const month = index + 1;
                const label = new Date(2024, index, 1).toLocaleDateString(intlDisplayLocaleForAppLanguage(lang), {
                    month: "short",
                });
                return { value: String(month), label };
            }),
        [lang],
    );

    const yearOptions = useMemo(() => {
        const years = new Set<number>();
        const currentGregorianYear = toGregorianCalendarDate(today(getLocalTimeZone())).year;
        years.add(currentGregorianYear);
        years.add(focusedGregorian.year);
        for (const key of dailyTotals.keys()) {
            const year = Number(key.slice(0, 4));
            if (!Number.isNaN(year)) years.add(year);
        }

        let minYear = currentGregorianYear;
        let maxYear = currentGregorianYear;
        for (const year of years) {
            minYear = Math.min(minYear, year);
            maxYear = Math.max(maxYear, year);
        }
        minYear = Math.max(minYear, currentGregorianYear - 10);

        const options: { value: string; label: string }[] = [];
        for (let year = maxYear; year >= minYear; year--) {
            const displayYear = usesBuddhistEra(lang) ? year + 543 : year;
            options.push({ value: String(displayYear), label: String(displayYear) });
        }
        return options;
    }, [dailyTotals, focusedGregorian.year, lang]);

    const selectedMonth = String(focusedGregorian.month);
    const selectedYear = String(usesBuddhistEra(lang) ? focusedGregorian.year + 543 : focusedGregorian.year);

    const handleMonthChange = (monthValue: string) => {
        const nextGregorian = focusedGregorian.set({ month: Number(monthValue) });
        onFocusedDateChange(toAppCalendarDate(nextGregorian, lang));
    };

    const handleYearChange = (yearValue: string) => {
        const displayYear = Number(yearValue);
        const gregorianYear = usesBuddhistEra(lang) ? displayYear - 543 : displayYear;
        const nextGregorian = focusedGregorian.set({ year: gregorianYear });
        onFocusedDateChange(toAppCalendarDate(nextGregorian, lang));
    };

    const goToToday = () => {
        const nowGregorian = toGregorianCalendarDate(today(getLocalTimeZone()));
        onFocusedDateChange(toAppCalendarDate(nowGregorian, lang));
    };

    const handleDayActivate = (date: CalendarDate) => {
        onDaySelect?.(date);
    };

    const handleCellClick = (date: CalendarDate, event: MouseEvent) => {
        event.preventDefault();
        handleDayActivate(date);
    };

    const todayKey = gregorianKeyFromCalendarDate(today(getLocalTimeZone()));

    return (
        <section className="analytic-card">
            <div className="analytic-card-body">
                <div className="analytic-card-header">
                    <h2 className="analytic-card-title">{t("analytic.calendarTitle")}</h2>
                    <div className="analytic-card-dropdown">
                        <Dropdown
                            label={t("analytic.month")}
                            data={monthOptions}
                            value={selectedMonth}
                            onValueChange={handleMonthChange}
                            minWidth={108}
                            margin={0.5}
                        />
                        <Dropdown
                            label={t("analytic.year")}
                            data={yearOptions}
                            value={selectedYear}
                            onValueChange={handleYearChange}
                            minWidth={96}
                            margin={0.5}
                        />
                    </div>
                </div>

                <div className="analytic-legend">
                    <div className="analytic-legend-item">
                        <span className="analytic-legend-dot analytic-legend-dot--income" aria-hidden />
                        <p className="analytic-legend-label">{t("analytic.income")}</p>
                    </div>
                    <div className="analytic-legend-item">
                        <span className="analytic-legend-dot analytic-legend-dot--expense" aria-hidden />
                        <p className="analytic-legend-label">{t("analytic.expense")}</p>
                    </div>
                </div>

                {loading ? (
                    <div
                        className="analytic-loading"
                        style={{ minHeight: CALENDAR_GRID_MIN_HEIGHT_PX + 44 }}
                    >
                        กำลังโหลด...
                    </div>
                ) : (
                    <Calendar
                        aria-label={t("analytic.calendarAria")}
                        focusedValue={focusedDate}
                        onFocusChange={onFocusedDateChange}
                        onChange={handleDayActivate}
                        className="w-full"
                    >
                        <header className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                            <Button
                                slot="previous"
                                className="rounded-full px-2 py-1 text-sm text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                            >
                                ‹
                            </Button>
                            <Heading className="text-center text-sm font-bold text-[var(--text)]" />
                            <div className="flex items-center justify-end gap-1.5">
                                <Button
                                    slot="next"
                                    className="rounded-full px-2 py-1 text-sm text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                                >
                                    ›
                                </Button>
                                <button
                                    type="button"
                                    onClick={goToToday}
                                    className="analytic-today-btn"
                                >
                                    {t("analytic.today")}
                                </button>
                            </div>
                        </header>
                        <div style={{ minHeight: CALENDAR_GRID_MIN_HEIGHT_PX }}>
                            <CalendarGrid className="w-full table-fixed border-separate border-spacing-0.5 [&_tbody_tr]:h-[58px]">
                                <CalendarGridHeader>
                                    {(day) => (
                                        <CalendarHeaderCell className="h-6 pb-1 text-center text-[10px] font-semibold text-[var(--text-soft)]">
                                            {day}
                                        </CalendarHeaderCell>
                                    )}
                                </CalendarGridHeader>
                                <CalendarGridBody>
                                    {(date) => {
                                        const key = gregorianKeyFromCalendarDate(date);
                                        const totals = dailyTotals.get(key) ?? EMPTY_DAILY_TOTALS;
                                        const hasActivity = totals.incomeCount > 0 || totals.expenseCount > 0;
                                        const isToday = key === todayKey;

                                        return (
                                            <CalendarCell
                                                date={date}
                                                onClick={(event) => handleCellClick(date, event)}
                                                className={`flex h-[58px] w-full cursor-pointer flex-col items-center justify-start rounded-[10px] px-0.5 py-1 text-[var(--text)] outline-none hover:bg-[var(--surface-soft)] data-[disabled]:text-gray-300 data-[outside-month]:opacity-40 data-[selected]:bg-[var(--primary-soft)] ${isToday ? "bg-[var(--primary-soft)]" : ""
                                                    }`}
                                            >
                                                <span
                                                    className={`text-xs font-bold leading-none ${isToday ? "text-[var(--primary)]" : ""
                                                        }`}
                                                >
                                                    {date.day}
                                                </span>
                                                <div className="mt-0.5 flex w-full flex-row flex-wrap items-center justify-center gap-0.5 leading-none mt-2">
                                                    {hasActivity ? (
                                                        <>
                                                            {totals.incomeCount > 0 && (
                                                                <span
                                                                    className="analytic-cal-badge analytic-cal-badge--income"
                                                                    title={`${t("analytic.income")} ${totals.incomeCount} ${t("analytic.items")} · ${totals.income.toLocaleString()}`}
                                                                >
                                                                    {totals.incomeCount}
                                                                </span>
                                                            )}
                                                            {totals.expenseCount > 0 && (
                                                                <span
                                                                    className="analytic-cal-badge analytic-cal-badge--expense"
                                                                    title={`${t("analytic.expense")} ${totals.expenseCount} ${t("analytic.items")} · ${totals.expense.toLocaleString()}`}
                                                                >
                                                                    {totals.expenseCount}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : null}
                                                </div>
                                            </CalendarCell>
                                        );
                                    }}
                                </CalendarGridBody>
                            </CalendarGrid>
                        </div>
                    </Calendar>
                )}
            </div>
        </section>
    );
}
