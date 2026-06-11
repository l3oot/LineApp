import { useEffect, useMemo, useState } from "react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import MainLayout from "../layouts/MainLayout";
import AnalyticCalendarCard from "../components/AnalyticCalendarCard";
import { ApiError } from "../lib/api";
import { auth } from "../lib/auth";
import { categoryApi, transactionApi, type Category, type Transaction } from "../lib/userService";
import dayjs from "dayjs";
import {
    buildDailyTotalsFromTransactions,
    buildExpenseShareFromTransactions,
    buildIncomeShareFromTransactions,
    buildTrendLineFromTransactions,
    buildYearlyBarFromTransactions,
    EXPENSE_PIE_COLORS,
    INCOME_PIE_COLORS,
    yearOptionsFromTransactions,
} from "../utils/buildAnalyticTrend";
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
import {
    analyticFilters,
    type AnalyticFilter,
} from "../data/analyticMockData";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend
);

import Dropdown from "../components/Dropdown";
import { displayYearFromGregorian } from "../utils/formatAppDate";

export default function Analytic() {
    const { t, i18n } = useTranslation();
    const [filter, setFilter] = useState<AnalyticFilter>("1Y");
    const [barYear, setBarYear] = useState(String(dayjs().year()));
    const [pieYear, setPieYear] = useState(String(dayjs().year()));
    const [calendarFocused, setCalendarFocused] = useState<CalendarDate>(() => today(getLocalTimeZone()));
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const brandColor = "#2f8f4e";
    const dangerColor = "#b23a3a";

    useEffect(() => {
        if (!auth.isAuthed()) {
            setTransactions([]);
            setExpenseCategories([]);
            setIncomeCategories([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        Promise.all([
            transactionApi.list(),
            categoryApi.list("expense"),
            categoryApi.list("income"),
        ])
            .then(([rows, expenseCats, incomeCats]) => {
                if (!cancelled) {
                    setTransactions(rows ?? []);
                    setExpenseCategories(expenseCats ?? []);
                    setIncomeCategories(incomeCats ?? []);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setTransactions([]);
                    setExpenseCategories([]);
                    setIncomeCategories([]);
                    setLoadError(err instanceof ApiError ? err.message : (err as Error).message);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const trendSeries = useMemo(
        () => buildTrendLineFromTransactions(transactions, filter, i18n.language),
        [transactions, filter, i18n.language],
    );

    const barYearOptions = useMemo(
        () => yearOptionsFromTransactions(transactions, i18n.language),
        [transactions, i18n.language],
    );

    const yearDropdownFallback = (year: string) => ({
        value: year,
        label: displayYearFromGregorian(Number(year), i18n.language),
    });

    const barSeries = useMemo(
        () => buildYearlyBarFromTransactions(transactions, Number(barYear), i18n.language),
        [transactions, barYear, i18n.language],
    );

    const expensePieSlices = useMemo(
        () =>
            buildExpenseShareFromTransactions(
                transactions,
                expenseCategories,
                Number(pieYear),
                t("analytic.other"),
            ),
        [transactions, expenseCategories, pieYear, t],
    );

    const dailyTotals = useMemo(
        () => buildDailyTotalsFromTransactions(transactions),
        [transactions],
    );

    const incomePieSlices = useMemo(
        () =>
            buildIncomeShareFromTransactions(
                transactions,
                incomeCategories,
                Number(pieYear),
                t("analytic.other"),
            ),
        [transactions, incomeCategories, pieYear, t],
    );

    const lineData = {
        labels: trendSeries.labels,
        datasets: [
            {
                label: t("analytic.income"),
                data: trendSeries.income,
                borderColor: brandColor,
                backgroundColor: "rgba(47, 143, 78, 0.15)",
                fill: "start",
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: brandColor,
                borderWidth: 3,
            },
            {
                label: t("analytic.expense"),
                data: trendSeries.expense,
                borderColor: dangerColor,
                backgroundColor: "rgba(178, 58, 58, 0.15)",
                fill: "start",
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: dangerColor,
                borderWidth: 3,
            },
        ],
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                mode: "index" as const,
                intersect: false,
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
                backgroundColor: "#2f8f4ecc",
                borderRadius: 5,
            },
            {
                label: t("analytic.expense"),
                data: barSeries.expense,
                backgroundColor: "#b23a3acc",
                borderRadius: 5,
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
                    display: false,
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
    ) => ({
        labels: slices.map((s) => s.label),
        datasets: [
            {
                label,
                data: slices.map((s) => s.amount),
                backgroundColor: slices.map((_, i) => colors[i % colors.length]),
                borderColor: "white",
                borderWidth: 3,
                hoverOffset: 15,
                radius: "80%",
            },
        ],
    });

    const expensePieData = buildPieData(
        expensePieSlices,
        t("analytic.expenseShare"),
        EXPENSE_PIE_COLORS,
    );
    const incomePieData = buildPieData(
        incomePieSlices,
        t("analytic.incomeShare"),
        INCOME_PIE_COLORS,
    );

    const pieOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false, // ❌ ปิด legend
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        return ` ${context.label}`;
                    },
                },
            },
        },
        maintainAspectRatio: false,
    };

    return (
        <MainLayout>
            <div className="flex flex-col gap-5 p-5">
                {/* Trend Chart Card */}
                <div className="flex flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden">
                    <div className="p-5 pb-7">
                        <div className="flex flex-row justify-between items-center mb-3">
                            <p className="font-bold text-[var(--text)] text-lg">{t("analytic.trendTitle")}</p>
                        </div>

                        {/* Custom Legend for Line Chart */}
                        <div className="flex flex-row gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-[#2f8f4e]" />
                                <p className="text-sm font-semibold text-[var(--text-soft)]">{t("analytic.income")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-[#b23a3a]" />
                                <p className="text-sm font-semibold text-[var(--text-soft)]">{t("analytic.expense")}</p>
                            </div>
                        </div>

                        {loadError && (
                            <p className="mb-3 text-sm text-[var(--danger)]">{loadError}</p>
                        )}
                        <div className="h-[250px] w-full">
                            {loading ? (
                                <div className="flex h-full items-center justify-center text-sm text-[var(--text-soft)]">
                                    กำลังโหลด...
                                </div>
                            ) : (
                                <Line data={lineData} options={lineOptions} />
                            )}
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex flex-row bg-[var(--surface-soft)] p-1 rounded-[var(--radius-control)] mt-6 justify-between">
                            {analyticFilters.map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all ${filter === f ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-soft)] hover:text-[var(--text)]"}`}>
                                    {t(`analytic.filter.${f}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bar Chart Card */}
                <div className="flex flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden">
                    <div className="p-5 pb-7">
                        <div className="flex flex-row justify-between items-center">
                            <p className="font-bold text-[var(--text)] text-lg">{t("analytic.incomeExpenseTitle")}</p>
                            <div className="flex items-center scale-90 origin-right">
                                <Dropdown
                                    label={t("analytic.year")}
                                    data={barYearOptions.length > 0 ? barYearOptions : [yearDropdownFallback(barYear)]}
                                    value={barYear}
                                    onValueChange={setBarYear}
                                />
                            </div>
                        </div>

                        {/* Custom Legend for Bar Chart */}
                        <div className="flex flex-row gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-[#2f8f4ecc]" />
                                <p className="text-sm font-semibold text-[var(--text-soft)]">{t("analytic.income")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-[#b23a3acc]" />
                                <p className="text-sm font-semibold text-[var(--text-soft)]">{t("analytic.expense")}</p>
                            </div>
                        </div>

                        <div className="w-full h-[300px] flex items-center justify-center">
                            {loading ? (
                                <div className="flex h-full items-center justify-center text-sm text-[var(--text-soft)]">
                                    กำลังโหลด...
                                </div>
                            ) : (
                                <Bar data={barData} options={options} />
                            )}
                        </div>
                    </div>
                </div>

                <AnalyticCalendarCard
                    dailyTotals={dailyTotals}
                    focusedDate={calendarFocused}
                    onFocusedDateChange={setCalendarFocused}
                    loading={loading}
                />

                {([
                    {
                        title: t("analytic.expenseShare"),
                        slices: expensePieSlices,
                        pieData: expensePieData,
                    },
                    {
                        title: t("analytic.incomeShare"),
                        slices: incomePieSlices,
                        pieData: incomePieData,
                    },
                ] as const).map((card) => (
                    <div
                        key={card.title}
                        className="flex flex-col items-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden"
                    >
                        <div className="flex flex-row justify-between items-center w-full px-5 mt-5">
                            <p className="font-bold text-[var(--text)] text-lg">{card.title}</p>
                            <div className="flex items-center">
                                <Dropdown
                                    label={t("analytic.year")}
                                    data={barYearOptions.length > 0 ? barYearOptions : [yearDropdownFallback(pieYear)]}
                                    value={pieYear}
                                    onValueChange={setPieYear}
                                />
                            </div>
                        </div>
                        <div className="w-full h-[200px] flex items-center pb-5">
                            {loading ? (
                                <div className="flex w-full items-center justify-center py-8 text-sm text-[var(--text-soft)]">
                                    กำลังโหลด...
                                </div>
                            ) : card.slices.length === 0 ? (
                                <div className="flex w-full items-center justify-center py-8 text-sm text-[var(--text-soft)]">
                                    {t("list.empty")}
                                </div>
                            ) : (
                                <>
                                    <div className="w-[30%] flex items-center justify-center">
                                        <Pie data={card.pieData} options={pieOptions} />
                                    </div>
                                    <div className="w-[70%] flex flex-col gap-2 px-6">
                                        {card.slices.map((item, index) => (
                                            <div key={`${card.title}-${item.label}-${index}`} className="flex items-center gap-3">
                                                <div
                                                    className="w-4 h-4 rounded-sm"
                                                    style={{
                                                        backgroundColor:
                                                            card.pieData.datasets[0].backgroundColor[index],
                                                    }}
                                                />
                                                <p className="text-sm font-semibold text-[var(--text)]">
                                                    {item.label}
                                                </p>
                                                <p className="text-sm text-[var(--text-soft)] ml-auto">
                                                    {item.percent}%
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </MainLayout>
    );
}