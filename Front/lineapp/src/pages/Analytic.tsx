import { useState } from "react";
import MainLayout from "../layouts/MainLayout";
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
    analyticBarDataSet,
    analyticBarLabels,
    analyticFilters,
    analyticLineDataByFilter,
    analyticPieDataList,
    analyticYearDropdownOptions,
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
    const { t } = useTranslation();
    const [filter, setFilter] = useState<AnalyticFilter>("1Y");
    const brandColor = "#2f8f4e";
    const dangerColor = "#b23a3a";
    const currentLineData = analyticLineDataByFilter[filter];

    const lineData = {
        labels: currentLineData.labels,
        datasets: [
            {
                label: t("analytic.income"),
                data: currentLineData.income,
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
                data: currentLineData.expense,
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
        labels: analyticBarLabels,
        datasets: [
            {
                label: t("analytic.income"),
                data: analyticBarDataSet.income,
                backgroundColor: "#2f8f4ecc",
                borderRadius: 5,
            },
            {
                label: t("analytic.expense"),
                data: analyticBarDataSet.expense,
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
        labels: analyticPieDataList.map((item) => item.label),
        datasets: [
            {
                label: t("analytic.expenseShare"),
                data: analyticPieDataList.map((item) => item.value),
                backgroundColor: [
                    "#2f8f4e",
                    "#a7772d",
                    "#b23a3a",
                    "#2d6fbe",
                    "#6b46b8",
                ],
                borderColor: "white",
                borderWidth: 3,
                hoverOffset: 15,
                radius: "80%", // Reduced size by 40% (displaying at 60% of max radius)
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

                        <div className="h-[250px] w-full">
                            <Line data={lineData} options={lineOptions} />
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
                                <Dropdown label={t("analytic.year")} data={analyticYearDropdownOptions} />
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
                            <Bar data={barData} options={options} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden">
                    <div className="flex flex-row justify-between items-center w-full px-5 mt-5">
                        <p className="font-bold text-[var(--text)] text-lg">{t("analytic.expenseShare")}</p>
                        <div className="flex items-center">
                            <Dropdown label={t("analytic.year")} data={analyticYearDropdownOptions} />
                        </div>
                    </div>
                    <div className="w-full h-[200px] flex items-center">
                        {/* Pie chart 30% */}
                        <div className="w-[30%] flex items-center justify-center">
                            <Pie data={pieData} options={pieOptions} />
                        </div>
                        {/* Legend 70% */}
                        <div className="w-[70%] flex flex-col gap-2 px-6">

                            {analyticPieDataList.map((item, index) => (
                                <div key={index} className="flex items-center gap-3">

                                    {/* color box */}
                                    <div
                                        className="w-4 h-4 rounded-sm"
                                        style={{
                                            backgroundColor:
                                                pieData.datasets[0].backgroundColor[index],
                                        }}
                                    />
                                    {/* label */}
                                    <p className="text-sm font-semibold text-[var(--text)]">
                                        {item.label}
                                    </p>

                                    {/* value */}
                                    <p className="text-sm text-[var(--text-soft)] ml-auto">
                                        {item.value}%
                                    </p>

                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}