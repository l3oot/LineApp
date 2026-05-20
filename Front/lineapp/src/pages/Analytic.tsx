import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { ApiError } from "../lib/api";
import { auth } from "../lib/auth";
import { categoryApi, transactionApi, type Category, type Transaction } from "../lib/userService";
import dayjs from "dayjs";
import {
    buildExpenseShareFromTransactions,
    buildTrendLineFromTransactions,
    buildYearlyBarFromTransactions,
    EXPENSE_PIE_COLORS,
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

export default function Analytic() {
    const { t, i18n } = useTranslation();
    const [filter, setFilter] = useState<AnalyticFilter>("1Y");
    const [barYear, setBarYear] = useState(String(dayjs().year()));
    const [pieYear, setPieYear] = useState(String(dayjs().year()));
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const brandColor = "#2f8f4e";
    const dangerColor = "#b23a3a";

    const locale = i18n.language.startsWith("en")
        ? "en-US"
        : i18n.language.startsWith("jp")
          ? "ja-JP"
          : "th-TH";

    useEffect(() => {
        if (!auth.isAuthed()) {
            setTransactions([]);
            setCategories([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        Promise.all([transactionApi.list(), categoryApi.list("expense")])
            .then(([rows, cats]) => {
                if (!cancelled) {
                    setTransactions(rows ?? []);
                    setCategories(cats ?? []);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setTransactions([]);
                    setCategories([]);
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
        () => buildTrendLineFromTransactions(transactions, filter, locale),
        [transactions, filter, locale],
    );

    const barYearOptions = useMemo(
        () => yearOptionsFromTransactions(transactions),
        [transactions],
    );

    const barSeries = useMemo(
        () => buildYearlyBarFromTransactions(transactions, Number(barYear), locale),
        [transactions, barYear, locale],
    );

    const pieSlices = useMemo(
        () =>
            buildExpenseShareFromTransactions(
                transactions,
                categories,
                Number(pieYear),
                t("analytic.other"),
            ),
        [transactions, categories, pieYear, t],
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
    const pieData = {
        labels: pieSlices.map((s) => s.label),
        datasets: [
            {
                label: t("analytic.expenseShare"),
                data: pieSlices.map((s) => s.amount),
                backgroundColor: pieSlices.map((_, i) => EXPENSE_PIE_COLORS[i % EXPENSE_PIE_COLORS.length]),
                borderColor: "white",
                borderWidth: 3,
                hoverOffset: 15,
                radius: "80%",
            },
        ],
    };

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
                                    {f}
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
                                    data={barYearOptions.length > 0 ? barYearOptions : [{ value: barYear }]}
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

                <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden">
                    <div className="flex flex-row justify-between items-center w-full px-5 mt-5">
                        <p className="font-bold text-[var(--text)] text-lg">{t("analytic.expenseShare")}</p>
                        <div className="flex items-center">
                            <Dropdown
                                label={t("analytic.year")}
                                data={barYearOptions.length > 0 ? barYearOptions : [{ value: pieYear }]}
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
                        ) : pieSlices.length === 0 ? (
                            <div className="flex w-full items-center justify-center py-8 text-sm text-[var(--text-soft)]">
                                {t("list.empty")}
                            </div>
                        ) : (
                            <>
                                <div className="w-[30%] flex items-center justify-center">
                                    <Pie data={pieData} options={pieOptions} />
                                </div>
                                <div className="w-[70%] flex flex-col gap-2 px-6">
                                    {pieSlices.map((item, index) => (
                                        <div key={`${item.label}-${index}`} className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-sm"
                                                style={{
                                                    backgroundColor:
                                                        pieData.datasets[0].backgroundColor[index],
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
            </div>
        </MainLayout>
    );
}