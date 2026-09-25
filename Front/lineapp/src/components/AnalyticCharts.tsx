import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import AnalyticCalendarCard from "./AnalyticCalendarCard";
import AnalyticDayTransactionsSheet from "./AnalyticDayTransactionsSheet";
import Dropdown from "./Dropdown";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { analyticFilters, type AnalyticFilter } from "../data/analyticMockData";
import type { Category, Transaction } from "../lib/userService";
import {
    buildDailyTotalsFromTransactions,
    buildExpenseShareFromTransactions,
    buildIncomeShareFromTransactions,
    buildSeasonBarFromTransactions,
    buildTrendLineFromTransactions,
    buildTrendLineInRange,
    buildYearlyBarFromTransactions,
    EXPENSE_PIE_COLORS,
    formatCompactAmount,
    INCOME_PIE_COLORS,
    yearOptionsFromTransactions,
} from "../utils/buildAnalyticTrend";
import {
    CHART_EXPENSE,
    CHART_INCOME,
    chartColorWithAlpha,
    chartColorWithOpacity,
} from "../utils/chartTheme";
import {
    displayYearFromGregorian,
    formatAppMonth,
    gregorianKeyFromCalendarDate,
    parseTxToGregorianCalendarDate,
    toGregorianCalendarDate,
} from "../utils/formatAppDate";
import { parseTxDateTime } from "../utils/parseTxDateTime";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend,
);

const linePointAmountLabelsPlugin = {
    id: "linePointAmountLabels",
    afterDatasetsDraw(chart: ChartJS) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (meta.hidden) return;

            meta.data.forEach((point, index) => {
                const value = dataset.data[index];
                if (typeof value !== "number" || value <= 0) return;

                const label = formatCompactAmount(value);
                if (!label) return;

                const { x, y } = point.getProps(["x", "y"], true);
                const color = typeof dataset.borderColor === "string" ? dataset.borderColor : "#333";
                const offsetY = datasetIndex === 0 ? -10 : 14;

                ctx.save();
                ctx.font = "600 10px system-ui, sans-serif";
                ctx.fillStyle = color;
                ctx.textAlign = "center";
                ctx.textBaseline = datasetIndex === 0 ? "bottom" : "top";
                ctx.fillText(label, x, y + offsetY);
                ctx.restore();
            });
        });
    },
};

type AnalyticSeasonOption = {
    cycleId: string;
    label: string;
    startDate: string;
    endDate: string;
};

type AnalyticChartsProps = {
    transactions: Transaction[];
    expenseCategories: Category[];
    incomeCategories: Category[];
    loading: boolean;
    loadError: string | null;
    initialFilter?: AnalyticFilter;
    startMonth?: number | null;
    endMonth?: number | null;
    /**
     * เมื่อมี seasons: แต่ละกราฟเลือกช่วงรอบเอง (dropdown แยกอิสระ)
     * preferredSeasonId ใช้เป็นค่าเริ่มต้นเท่านั้น
     */
    seasons?: AnalyticSeasonOption[];
    preferredSeasonId?: string | null;
    allSeasonsLabel?: string;
};

const ALL_SEASONS_TAB = "all";

function monthsInSeason(startMonth: number, endMonth: number): number[] {
    const months: number[] = [];
    if (startMonth <= endMonth) {
        for (let m = startMonth; m <= endMonth; m++) months.push(m);
        return months;
    }
    for (let m = startMonth; m <= 12; m++) months.push(m);
    for (let m = 1; m <= endMonth; m++) months.push(m);
    return months;
}

function yearForSeasonMonth(
    month: number,
    startMonth: number,
    endMonth: number,
    seasonStartDate: string | null | undefined,
): number {
    const startYear = seasonStartDate ? dayjs(seasonStartDate).year() : dayjs().year();
    if (endMonth >= startMonth) return startYear;
    return month >= startMonth ? startYear : startYear + 1;
}

export default function AnalyticCharts({
    transactions,
    expenseCategories,
    incomeCategories,
    loading,
    loadError,
    initialFilter = "1M",
    startMonth,
    endMonth,
    seasons,
    preferredSeasonId = null,
    allSeasonsLabel,
}: AnalyticChartsProps) {
    const { t, i18n } = useTranslation();
    const [filter, setFilter] = useState<AnalyticFilter>(initialFilter);
    const [trendSeasonId, setTrendSeasonId] = useState("");
    const [selectedSeasonMonth, setSelectedSeasonMonth] = useState<number | null>(null);
    const [barYear, setBarYear] = useState(String(dayjs().year()));
    const [barSeasonId, setBarSeasonId] = useState("");
    const [expensePieSeasonId, setExpensePieSeasonId] = useState("");
    const [incomePieSeasonId, setIncomePieSeasonId] = useState("");
    const [pieYear, setPieYear] = useState(String(dayjs().year()));
    const [calendarFocused, setCalendarFocused] = useState<CalendarDate>(() => today(getLocalTimeZone()));
    const [selectedDay, setSelectedDay] = useState<CalendarDate | null>(null);
    const [daySheetOpen, setDaySheetOpen] = useState(false);
    const [activeExpensePieIndex, setActiveExpensePieIndex] = useState<number | null>(null);
    const [activeIncomePieIndex, setActiveIncomePieIndex] = useState<number | null>(null);

    const seasonBarOptions = useMemo(
        () => [
            {
                value: ALL_SEASONS_TAB,
                label: allSeasonsLabel ?? t("cycle.seasonAllYears"),
            },
            ...(seasons ?? []).map((s) => ({
                value: s.cycleId,
                label: s.label,
            })),
        ],
        [seasons, allSeasonsLabel, t],
    );
    const useSeasonBar = (seasons?.length ?? 0) > 0;

    const defaultSeasonId = useMemo(() => {
        if (!seasons?.length) return "";
        if (preferredSeasonId === ALL_SEASONS_TAB) return ALL_SEASONS_TAB;
        if (preferredSeasonId && seasons.some((s) => s.cycleId === preferredSeasonId)) {
            return preferredSeasonId;
        }
        return ALL_SEASONS_TAB;
    }, [seasons, preferredSeasonId]);

    const isValidSeasonId = useCallback(
        (id: string) =>
            Boolean(
                seasons?.length &&
                    (id === ALL_SEASONS_TAB || seasons.some((s) => s.cycleId === id)),
            ),
        [seasons],
    );

    useEffect(() => {
        if (!seasons?.length) {
            setTrendSeasonId("");
            setBarSeasonId("");
            setExpensePieSeasonId("");
            setIncomePieSeasonId("");
            return;
        }
        setTrendSeasonId((prev) => (isValidSeasonId(prev) ? prev : defaultSeasonId));
        setBarSeasonId((prev) => (isValidSeasonId(prev) ? prev : defaultSeasonId));
        setExpensePieSeasonId((prev) => (isValidSeasonId(prev) ? prev : defaultSeasonId));
        setIncomePieSeasonId((prev) => (isValidSeasonId(prev) ? prev : defaultSeasonId));
    }, [seasons, defaultSeasonId, isValidSeasonId]);

    const trendSeason = useMemo(
        () =>
            trendSeasonId === ALL_SEASONS_TAB
                ? null
                : (seasons?.find((s) => s.cycleId === trendSeasonId) ?? null),
        [seasons, trendSeasonId],
    );
    const seasonMonthMode = useSeasonBar && trendSeasonId !== ALL_SEASONS_TAB && Boolean(trendSeason);
    const seasonStartDate = trendSeason?.startDate ?? null;

    const seasonMonths = useMemo(() => {
        if (!seasonMonthMode || startMonth == null || endMonth == null) return [];
        return monthsInSeason(startMonth, endMonth);
    }, [seasonMonthMode, startMonth, endMonth]);

    useEffect(() => {
        if (!seasonMonthMode) {
            setSelectedSeasonMonth(null);
            return;
        }
        if (seasonMonths.length === 0) {
            setSelectedSeasonMonth(null);
            return;
        }
        setSelectedSeasonMonth((prev) =>
            prev != null && seasonMonths.includes(prev) ? prev : seasonMonths[0],
        );
    }, [seasonMonthMode, seasonMonths, seasonStartDate]);

    const seasonRangeForId = useCallback(
        (seasonId: string): { startDate: string | null; endDate: string | null } | null => {
            if (!useSeasonBar || !seasons?.length) return null;
            if (seasonId === ALL_SEASONS_TAB) {
                let startDate: string | null = null;
                let endDate: string | null = null;
                for (const s of seasons) {
                    if (s.startDate && (!startDate || s.startDate < startDate)) startDate = s.startDate;
                    if (s.endDate && (!endDate || s.endDate > endDate)) endDate = s.endDate;
                }
                return { startDate, endDate };
            }
            const season = seasons.find((s) => s.cycleId === seasonId);
            if (!season) return null;
            return { startDate: season.startDate, endDate: season.endDate };
        },
        [useSeasonBar, seasons],
    );

    const selectedSeasonRange = useMemo(
        () => seasonRangeForId(barSeasonId),
        [seasonRangeForId, barSeasonId],
    );
    const expensePieSeasonRange = useMemo(
        () => seasonRangeForId(expensePieSeasonId),
        [seasonRangeForId, expensePieSeasonId],
    );
    const incomePieSeasonRange = useMemo(
        () => seasonRangeForId(incomePieSeasonId),
        [seasonRangeForId, incomePieSeasonId],
    );

    const trendTransactions = useMemo(() => {
        if (!useSeasonBar || trendSeasonId === ALL_SEASONS_TAB) return transactions;
        return transactions.filter((tx) => tx.cycleId === trendSeasonId);
    }, [transactions, useSeasonBar, trendSeasonId]);

    const handleDaySelect = useCallback((date: CalendarDate) => {
        setSelectedDay(date);
        setDaySheetOpen(true);
    }, []);

    const handleCloseDaySheet = useCallback(() => {
        setDaySheetOpen(false);
    }, []);

    const handleDaySheetClosed = useCallback(() => {
        setSelectedDay(null);
    }, []);

    const incomeColor = CHART_INCOME;
    const expenseColor = CHART_EXPENSE;

    const trendSeries = useMemo(() => {
        if (
            seasonMonthMode &&
            selectedSeasonMonth != null &&
            startMonth != null &&
            endMonth != null
        ) {
            const year = yearForSeasonMonth(
                selectedSeasonMonth,
                startMonth,
                endMonth,
                seasonStartDate,
            );
            const rangeStart = dayjs(`${year}-${String(selectedSeasonMonth).padStart(2, "0")}-01`).startOf(
                "month",
            );
            const rangeEnd = rangeStart.endOf("month");
            return buildTrendLineInRange(trendTransactions, rangeStart, rangeEnd, "1M", i18n.language);
        }
        return buildTrendLineFromTransactions(trendTransactions, filter, i18n.language);
    }, [
        trendTransactions,
        filter,
        i18n.language,
        seasonMonthMode,
        selectedSeasonMonth,
        startMonth,
        endMonth,
        seasonStartDate,
    ]);

    const barYearOptions = useMemo(
        () => yearOptionsFromTransactions(transactions, i18n.language),
        [transactions, i18n.language],
    );

    const yearDropdownFallback = (year: string) => ({
        value: year,
        label: displayYearFromGregorian(Number(year), i18n.language),
    });

    const barSeries = useMemo(() => {
        if (useSeasonBar && selectedSeasonRange) {
            return buildSeasonBarFromTransactions(
                transactions,
                selectedSeasonRange.startDate,
                selectedSeasonRange.endDate,
                i18n.language,
            );
        }
        return buildYearlyBarFromTransactions(transactions, Number(barYear), i18n.language);
    }, [transactions, barYear, i18n.language, useSeasonBar, selectedSeasonRange]);

    const allCategories = useMemo(
        () => [...expenseCategories, ...incomeCategories],
        [expenseCategories, incomeCategories],
    );

    const categoryById = useMemo(
        () => Object.fromEntries(allCategories.map((c) => [c.categoryId, c.name])),
        [allCategories],
    );

    const expensePieSlices = useMemo(
        () =>
            buildExpenseShareFromTransactions(
                transactions,
                allCategories,
                Number(pieYear),
                t("analytic.other"),
                t("analytic.uncategorized"),
                useSeasonBar ? expensePieSeasonRange : null,
            ),
        [transactions, allCategories, pieYear, t, useSeasonBar, expensePieSeasonRange],
    );

    const dailyTotals = useMemo(
        () => buildDailyTotalsFromTransactions(transactions),
        [transactions],
    );

    const selectedDayTransactions = useMemo(() => {
        if (!selectedDay) return [];
        const key = gregorianKeyFromCalendarDate(toGregorianCalendarDate(selectedDay));
        return transactions
            .filter(
                (tx) =>
                    gregorianKeyFromCalendarDate(parseTxToGregorianCalendarDate(tx.txDate)) === key,
            )
            .sort(
                (a, b) => parseTxDateTime(b.txDate).getTime() - parseTxDateTime(a.txDate).getTime(),
            );
    }, [selectedDay, transactions]);

    const selectedDayTotals = useMemo(() => {
        let income = 0;
        let expense = 0;
        for (const tx of selectedDayTransactions) {
            const amount = Number(tx.amount);
            if (Number.isNaN(amount)) continue;
            if (tx.txType === "income") income += amount;
            else if (tx.txType === "expense") expense += amount;
        }
        return { income, expense };
    }, [selectedDayTransactions]);

    const incomePieSlices = useMemo(
        () =>
            buildIncomeShareFromTransactions(
                transactions,
                allCategories,
                Number(pieYear),
                t("analytic.other"),
                t("analytic.uncategorized"),
                useSeasonBar ? incomePieSeasonRange : null,
            ),
        [transactions, allCategories, pieYear, t, useSeasonBar, incomePieSeasonRange],
    );

    useEffect(() => {
        setActiveExpensePieIndex(null);
    }, [pieYear, expensePieSeasonId, expensePieSlices]);

    useEffect(() => {
        setActiveIncomePieIndex(null);
    }, [pieYear, incomePieSeasonId, incomePieSlices]);

    const lineData = {
        labels: trendSeries.labels,
        datasets: [
            {
                label: t("analytic.income"),
                data: trendSeries.income,
                borderColor: incomeColor,
                backgroundColor: chartColorWithAlpha(incomeColor, 0.15),
                fill: "start",
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: incomeColor,
                borderWidth: 3,
            },
            {
                label: t("analytic.expense"),
                data: trendSeries.expense,
                borderColor: expenseColor,
                backgroundColor: chartColorWithAlpha(expenseColor, 0.15),
                fill: "start",
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: expenseColor,
                borderWidth: 3,
            },
        ],
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 16,
                bottom: 8,
            },
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                mode: "index" as const,
                intersect: false,
                callbacks: {
                    label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
                        const value = context.parsed.y ?? 0;
                        return ` ${context.dataset.label}: ${value.toLocaleString()}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: "rgba(0, 0, 0, 0.05)",
                },
            },
        },
    };
    const barData = {
        labels: barSeries.labels,
        datasets: [
            {
                label: t("analytic.income"),
                data: barSeries.income,
                backgroundColor: chartColorWithOpacity(incomeColor, "cc"),
                borderRadius: 8,
            },
            {
                label: t("analytic.expense"),
                data: barSeries.expense,
                backgroundColor: chartColorWithOpacity(expenseColor, "cc"),
                borderRadius: 8,
            },
        ],
    };

    const options = {
        responsive: true,
        scales: {
            x: {
                grid: {
                    display: false,
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: "rgba(0, 0, 0, 0.05)",
                },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
        },
        maintainAspectRatio: false,
    };
    const buildPieData = (
        slices: typeof expensePieSlices,
        label: string,
        colors: string[],
        activeIndex: number | null,
    ) => ({
        labels: slices.map((s) => s.label),
        datasets: [
            {
                label,
                data: slices.map((s) => s.amount),
                backgroundColor: slices.map((_, i) => {
                    const color = colors[i % colors.length];
                    if (activeIndex === null || activeIndex === i) return color;
                    return `${color}55`;
                }),
                borderColor: "white",
                borderWidth: 3,
                hoverOffset: 15,
                offset: slices.map((_, i) => (activeIndex === i ? 18 : 0)),
                radius: "80%",
            },
        ],
    });

    const expensePieData = buildPieData(
        expensePieSlices,
        t("analytic.expenseShare"),
        EXPENSE_PIE_COLORS,
        activeExpensePieIndex,
    );
    const incomePieData = buildPieData(
        incomePieSlices,
        t("analytic.incomeShare"),
        INCOME_PIE_COLORS,
        activeIncomePieIndex,
    );

    const pieOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function (context: { label?: string }) {
                        return ` ${context.label ?? ""}`;
                    },
                },
            },
        },
        maintainAspectRatio: false,
    };

    return (
        <>
            <section className="analytic-card">
                <div className="analytic-card-body">
                    <div className="analytic-card-header">
                        <h2 className="analytic-card-title">{t("analytic.trendTitle")}</h2>
                        {useSeasonBar ? (
                            <div className="analytic-card-dropdown">
                                <Dropdown
                                    label={t("analytic.season")}
                                    data={seasonBarOptions}
                                    value={trendSeasonId || seasonBarOptions[0]?.value}
                                    onValueChange={setTrendSeasonId}
                                    minWidth={160}
                                />
                            </div>
                        ) : null}
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

                    {loadError && <p className="analytic-error">{loadError}</p>}
                    <div className="analytic-chart-wrap">
                        {loading ? (
                            <div className="analytic-loading">{t("analytic.loading")}</div>
                        ) : (
                            <Line
                                data={lineData}
                                options={lineOptions}
                                plugins={[linePointAmountLabelsPlugin]}
                            />
                        )}
                    </div>

                    <div className="analytic-filter-bar pill-segment-track">
                        {seasonMonthMode && seasonMonths.length > 0
                            ? seasonMonths.map((month) => {
                                  const wrapsYear =
                                      startMonth != null &&
                                      endMonth != null &&
                                      endMonth < startMonth;
                                  const inNextYear = wrapsYear && month <= (endMonth as number);
                                  const monthLabel = formatAppMonth(month, i18n.language);
                                  const label =
                                      inNextYear && seasonStartDate
                                          ? `${monthLabel} ${displayYearFromGregorian(
                                                yearForSeasonMonth(
                                                    month,
                                                    startMonth as number,
                                                    endMonth as number,
                                                    seasonStartDate,
                                                ),
                                                i18n.language,
                                            )}`
                                          : monthLabel;
                                  return (
                                      <button
                                          key={month}
                                          type="button"
                                          onClick={() => setSelectedSeasonMonth(month)}
                                          className={`pill-control pill-control--chip pill-control--ghost analytic-filter-btn${
                                              selectedSeasonMonth === month ? " is-active" : ""
                                          }`}
                                      >
                                          {label}
                                      </button>
                                  );
                              })
                            : analyticFilters.map((f) => (
                                  <button
                                      key={f}
                                      type="button"
                                      onClick={() => setFilter(f)}
                                      className={`pill-control pill-control--chip pill-control--ghost analytic-filter-btn${filter === f ? " is-active" : ""}`}
                                  >
                                      {t(`analytic.filter.${f}`)}
                                  </button>
                              ))}
                    </div>
                </div>
            </section>

            <section className="analytic-card">
                <div className="analytic-card-body">
                    <div className="analytic-card-header">
                        <h2 className="analytic-card-title">{t("analytic.incomeExpenseTitle")}</h2>
                        <div className="analytic-card-dropdown">
                            {useSeasonBar ? (
                                <Dropdown
                                    label={t("analytic.season")}
                                    data={seasonBarOptions}
                                    value={barSeasonId || seasonBarOptions[0]?.value}
                                    onValueChange={setBarSeasonId}
                                    minWidth={160}
                                />
                            ) : (
                                <Dropdown
                                    label={t("analytic.year")}
                                    data={
                                        barYearOptions.length > 0
                                            ? barYearOptions
                                            : [yearDropdownFallback(barYear)]
                                    }
                                    value={barYear}
                                    onValueChange={setBarYear}
                                />
                            )}
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

                    <div className="analytic-chart-wrap analytic-chart-wrap--bar">
                        {loading ? (
                            <div className="analytic-loading">{t("analytic.loading")}</div>
                        ) : (
                            <Bar
                                data={barData}
                                options={options}
                            />
                        )}
                    </div>
                </div>
            </section>

            {([
                {
                    key: "expense" as const,
                    title: t("analytic.expenseShare"),
                    slices: expensePieSlices,
                    pieData: expensePieData,
                    colors: EXPENSE_PIE_COLORS,
                    activeIndex: activeExpensePieIndex,
                    setActiveIndex: setActiveExpensePieIndex,
                    seasonId: expensePieSeasonId,
                    setSeasonId: setExpensePieSeasonId,
                },
                {
                    key: "income" as const,
                    title: t("analytic.incomeShare"),
                    slices: incomePieSlices,
                    pieData: incomePieData,
                    colors: INCOME_PIE_COLORS,
                    activeIndex: activeIncomePieIndex,
                    setActiveIndex: setActiveIncomePieIndex,
                    seasonId: incomePieSeasonId,
                    setSeasonId: setIncomePieSeasonId,
                },
            ]).map((card) => (
                <section key={card.title} className="analytic-pie-card">
                    <div className="analytic-pie-card-header">
                        <h2 className="analytic-card-title">{card.title}</h2>
                        <div className="analytic-card-dropdown">
                            {useSeasonBar ? (
                                <Dropdown
                                    label={t("analytic.season")}
                                    data={seasonBarOptions}
                                    value={card.seasonId || seasonBarOptions[0]?.value}
                                    onValueChange={card.setSeasonId}
                                    minWidth={160}
                                />
                            ) : (
                                <Dropdown
                                    label={t("analytic.year")}
                                    data={
                                        barYearOptions.length > 0
                                            ? barYearOptions
                                            : [yearDropdownFallback(pieYear)]
                                    }
                                    value={pieYear}
                                    onValueChange={setPieYear}
                                />
                            )}
                        </div>
                    </div>
                    <div className="analytic-pie-layout">
                        {loading ? (
                            <div className="analytic-empty">{t("analytic.loading")}</div>
                        ) : card.slices.length === 0 ? (
                            <div className="analytic-empty">{t("list.empty")}</div>
                        ) : (
                            <>
                                <div className="analytic-pie-chart">
                                    <Pie data={card.pieData} options={pieOptions} />
                                </div>
                                <div className="analytic-pie-legend-list">
                                    {card.slices.map((item, index) => {
                                        const isActive = card.activeIndex === index;
                                        return (
                                            <button
                                                key={`${card.key}-${item.label}-${index}`}
                                                type="button"
                                                onClick={() =>
                                                    card.setActiveIndex((current) =>
                                                        current === index ? null : index,
                                                    )
                                                }
                                                className={`analytic-pie-legend-btn${isActive ? " is-active" : ""}`}
                                            >
                                                <span
                                                    className="analytic-pie-swatch"
                                                    style={{
                                                        backgroundColor:
                                                            card.colors[index % card.colors.length],
                                                        opacity:
                                                            isActive || card.activeIndex === null ? 1 : 0.45,
                                                    }}
                                                />
                                                <p className="analytic-pie-legend-label">{item.label}</p>
                                                <p className="analytic-pie-legend-percent">{item.percent}%</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </section>
            ))}

            <AnalyticCalendarCard
                dailyTotals={dailyTotals}
                focusedDate={calendarFocused}
                onFocusedDateChange={setCalendarFocused}
                onDaySelect={handleDaySelect}
                loading={loading}
            />

            <AnalyticDayTransactionsSheet
                open={daySheetOpen}
                date={selectedDay}
                transactions={selectedDayTransactions}
                categoryById={categoryById}
                incomeTotal={selectedDayTotals.income}
                expenseTotal={selectedDayTotals.expense}
                onRequestClose={handleCloseDaySheet}
                onClosed={handleDaySheetClosed}
            />
        </>
    );
}
