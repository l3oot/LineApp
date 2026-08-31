import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
    type ChartData,
    type ChartOptions,
    type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { LuCloud, LuCloudLightning, LuCloudRain, LuCloudSun, LuMapPin, LuSnowflake, LuSun } from "react-icons/lu";
import { weatherConditionKey, type WeatherHour } from "../lib/weatherApi";
import AppLoadingScreen from "./AppLoadingScreen";
import { APP_TIME_ZONE } from "../utils/parseTxDateTime";
import { intlLocaleForAppLanguage } from "../utils/formatAppDate";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type ChartTab = "temp" | "humidity";

type DayCard = {
    key: string;
    weekday: string;
    high: number;
    low: number;
    condition: number;
};

type WeatherBoardProps = {
    locationLabel: string;
    current: WeatherHour;
    daily: WeatherHour[];
    hourlyByDate: Record<string, WeatherHour[]>;
    hourlyLoadingDate: string | null;
    onNeedHourlyDay: (date: string) => void;
};

const CHART_LINE = "#4D9EFF";
const CHART_LABEL = "#1B2433";
const CHART_TICK = "#6E7A72";

const pointValueLabels: Plugin<"line"> = {
    id: "weatherPointValueLabels",
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        ctx.save();
        ctx.fillStyle = CHART_LABEL;
        ctx.font = "700 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        meta.data.forEach((point, index) => {
            const value = chart.data.datasets[0]?.data[index];
            if (typeof value !== "number" || !Number.isFinite(value)) return;
            ctx.fillText(String(Math.round(value)), point.x, point.y - 8);
        });
        ctx.restore();
    },
};

function bangkokParts(time: string): { dayKey: string; hour: number; date: Date } | null {
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: APP_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((part) => part.type === type)?.value ?? Number.NaN);
    const year = read("year");
    const month = read("month");
    const day = read("day");
    const hour = read("hour");
    if (![year, month, day, hour].every(Number.isFinite)) return null;
    return {
        dayKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        hour,
        date,
    };
}

function formatClock(time: string, language: string): string {
    const parsed = Date.parse(time);
    if (!Number.isFinite(parsed)) return time;
    return new Intl.DateTimeFormat(intlLocaleForAppLanguage(language), {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: APP_TIME_ZONE,
    }).format(new Date(parsed));
}

function formatWeekdayTime(time: string, language: string): string {
    const parsed = Date.parse(time);
    if (!Number.isFinite(parsed)) return time;
    const date = new Date(parsed);
    const weekday = new Intl.DateTimeFormat(intlLocaleForAppLanguage(language), {
        weekday: "long",
        timeZone: APP_TIME_ZONE,
    }).format(date);
    return `${weekday} ${formatClock(time, language)}`;
}

function formatDayHeading(time: string, language: string): string {
    const parsed = Date.parse(time);
    if (!Number.isFinite(parsed)) return time;
    return new Intl.DateTimeFormat(intlLocaleForAppLanguage(language), {
        weekday: "long",
        day: "numeric",
        month: "short",
        timeZone: APP_TIME_ZONE,
    }).format(new Date(parsed));
}

function formatChartLabel(time: string, language: string, daily: boolean): string {
    if (!daily) return formatClock(time, language);
    return formatWeekdayCard(time, language);
}

function dayRange(row: WeatherHour): { high: number; low: number } {
    const high = row.temperatureMaxC ?? row.temperatureC;
    const low = row.temperatureMinC ?? row.temperatureC;
    return { high: Math.max(high, low), low: Math.min(high, low) };
}

function formatWeekdayCard(time: string, language: string): string {
    const parsed = Date.parse(time);
    if (!Number.isFinite(parsed)) return time;
    const weekday = new Intl.DateTimeFormat(intlLocaleForAppLanguage(language), {
        weekday: "long",
        timeZone: APP_TIME_ZONE,
    }).format(new Date(parsed));
    return weekday.replace(/^วัน/, "");
}

function conditionLabel(condition: number, t: (key: string) => string): string {
    const key = weatherConditionKey(condition);
    return key ? t(key) : t("weather.unavailable");
}

function WeatherGlyph({ condition, size = 48 }: { condition: number; size?: number }) {
    const className = "weather-board-glyph";
    if (condition === 8) return <LuCloudLightning size={size} className={`${className} weather-board-glyph--storm`} />;
    if (condition >= 5 && condition <= 7) return <LuCloudRain size={size} className={`${className} weather-board-glyph--rain`} />;
    if (condition === 4) return <LuCloud size={size} className={`${className} weather-board-glyph--cloud`} />;
    if (condition >= 9 && condition <= 11) return <LuSnowflake size={size} className={`${className} weather-board-glyph--cold`} />;
    if (condition === 12 || condition === 1) return <LuSun size={size} className={`${className} weather-board-glyph--sun`} />;
    if (condition === 2 || condition === 3) return <LuCloudSun size={size} className={`${className} weather-board-glyph--sun`} />;
    return <LuCloud size={size} className={`${className} weather-board-glyph--cloud`} />;
}

function closestHour(rows: WeatherHour[], targetHour: number): WeatherHour {
    let best = rows[0];
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const row of rows) {
        const hour = bangkokParts(row.time)?.hour;
        if (hour == null) continue;
        const diff = Math.min(Math.abs(hour - targetHour), 24 - Math.abs(hour - targetHour));
        if (diff < bestDiff) {
            best = row;
            bestDiff = diff;
        }
    }
    return best;
}

function buildDayCards(hours: WeatherHour[], language: string, current: WeatherHour, daily: boolean): DayCard[] {
    if (daily) {
        const currentDayKey = bangkokParts(current.time)?.dayKey;
        return hours.map((row) => {
            const range = dayRange(row);
            const key = bangkokParts(row.time)?.dayKey ?? row.time;
            return {
                key,
                weekday: formatWeekdayCard(row.time, language),
                high: range.high,
                low: range.low,
                condition: key === currentDayKey ? current.condition : row.condition,
            };
        });
    }
    const groups = new Map<string, WeatherHour[]>();
    for (const hour of hours) {
        const parts = bangkokParts(hour.time);
        if (!parts) continue;
        const list = groups.get(parts.dayKey) ?? [];
        list.push(hour);
        groups.set(parts.dayKey, list);
    }
    const currentDayKey = bangkokParts(current.time)?.dayKey;
    const currentHour = bangkokParts(current.time)?.hour ?? 13;
    return [...groups.entries()].map(([key, rows]) => {
        const temps = rows.map((row) => row.temperatureC);
        const sample = closestHour(rows, currentHour);
        return {
            key,
            weekday: formatWeekdayCard(sample.time, language),
            high: Math.max(...temps),
            low: Math.min(...temps),
            condition: key === currentDayKey ? current.condition : sample.condition,
        };
    });
}

function downsampleHourly(hours: WeatherHour[]): WeatherHour[] {
    if (hours.length === 0) return hours;
    const threes = hours.filter((hour) => {
        const hourValue = bangkokParts(hour.time)?.hour;
        return hourValue != null && hourValue % 3 === 0;
    });
    if (threes.length >= 4) return threes;
    if (hours.length <= 8) return hours;
    const step = Math.ceil(hours.length / 8);
    return hours.filter((_, index) => index % step === 0);
}

export default function WeatherBoard({
    locationLabel,
    current,
    daily,
    hourlyByDate,
    hourlyLoadingDate,
    onNeedHourlyDay,
}: WeatherBoardProps) {
    const { t, i18n } = useTranslation();
    const [tab, setTab] = useState<ChartTab>("temp");
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const days = useMemo(
        () =>
            buildDayCards(
                daily.length > 0 ? daily : Object.values(hourlyByDate).flat(),
                i18n.language,
                current,
                daily.length > 0,
            ),
        [daily, hourlyByDate, i18n.language, current],
    );
    const currentDayKey = bangkokParts(current.time)?.dayKey ?? days[0]?.key ?? null;
    const activeDay = selectedDay && days.some((day) => day.key === selectedDay) ? selectedDay : currentDayKey;
    const dayHours = activeDay ? (hourlyByDate[activeDay] ?? []) : [];
    const chartLoading = Boolean(activeDay && hourlyLoadingDate === activeDay && dayHours.length === 0);

    useEffect(() => {
        if (activeDay) onNeedHourlyDay(activeDay);
    }, [activeDay, onNeedHourlyDay]);

    const displayHour = useMemo(() => {
        if (dayHours.length > 0) {
            if (activeDay === currentDayKey) return current;
            return closestHour(dayHours, 13);
        }
        if (!activeDay || activeDay === currentDayKey) return current;
        const dailyMatch = daily.find((row) => bangkokParts(row.time)?.dayKey === activeDay);
        return dailyMatch ?? current;
    }, [activeDay, current, currentDayKey, daily, dayHours]);
    const displayIsHourly = dayHours.some((row) => row.time === displayHour.time);

    const chartHours = useMemo(() => downsampleHourly(dayHours), [dayHours]);

    const chartData = useMemo<ChartData<"line">>(
        () => ({
            labels: chartHours.map((hour) => formatChartLabel(hour.time, i18n.language, false)),
            datasets: [
                {
                    data: chartHours.map((hour) => (tab === "temp" ? hour.temperatureC : hour.humidityPercent)),
                    borderColor: CHART_LINE,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return "rgba(77, 158, 255, 0.16)";
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, "rgba(77, 158, 255, 0.28)");
                        gradient.addColorStop(1, "rgba(77, 158, 255, 0.02)");
                        return gradient;
                    },
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: CHART_LINE,
                    pointBorderColor: CHART_LINE,
                    borderWidth: 2,
                },
            ],
        }),
        [chartHours, i18n.language, tab],
    );

    const chartOptions = useMemo<ChartOptions<"line">>(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 18, right: 8, left: 4 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed.y;
                            if (typeof value !== "number") return "";
                            return tab === "temp" ? ` ${value}°` : ` ${value}%`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: CHART_TICK,
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8,
                        font: { size: 11, weight: 600 },
                    },
                },
                y: {
                    display: false,
                    suggestedMin: tab === "humidity" ? 0 : undefined,
                    suggestedMax: tab === "humidity" ? 100 : undefined,
                },
            },
        }),
        [tab],
    );

    return (
        <section className="weather-board" aria-label={t("weather.hourlyTitle")}>
            <div className="weather-board-head">
                <p className="weather-board-location">
                    <LuMapPin size={16} aria-hidden />
                    <span>{locationLabel || t("weather.locationUnset")}</span>
                </p>
            </div>

            <div className="weather-board-now">
                <WeatherGlyph condition={displayHour.condition} size={56} />
                <div className="weather-board-temp-block">
                    <p className="weather-board-temp">{displayHour.temperatureC}</p>
                    <p className="weather-board-unit">{t("weather.unitC")}</p>
                </div>
                <div className="weather-board-metrics">
                    <p>{t("weather.humidityLine", { value: displayHour.humidityPercent })}</p>
                </div>
                <div className="weather-board-status">
                    <p className="weather-board-status-kicker">{t("weather.heading")}</p>
                    <p className="weather-board-status-time">
                        {displayIsHourly
                            ? formatWeekdayTime(displayHour.time, i18n.language)
                            : formatDayHeading(displayHour.time, i18n.language)}
                    </p>
                    <p className="weather-board-status-cond">{conditionLabel(displayHour.condition, t)}</p>
                </div>
            </div>

            <div className="weather-board-tabs" role="tablist" aria-label={t("weather.chartTabs")}>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "temp"}
                    className={`weather-board-tab${tab === "temp" ? " is-active" : ""}`}
                    onClick={() => setTab("temp")}
                >
                    {t("weather.tabTemp")}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "humidity"}
                    className={`weather-board-tab${tab === "humidity" ? " is-active" : ""}`}
                    onClick={() => setTab("humidity")}
                >
                    {t("weather.tabHumidity")}
                </button>
            </div>

            <div className="weather-board-chart">
                {chartHours.length > 0 ? (
                    <Line key={activeDay ?? "chart"} data={chartData} options={chartOptions} plugins={[pointValueLabels]} />
                ) : chartLoading ? (
                    <AppLoadingScreen variant="inline" label={t("weather.loading")} />
                ) : (
                    <p className="weather-board-chart-empty">{t("weather.unavailable")}</p>
                )}
            </div>

            {days.length > 0 && (
                <div className="weather-board-days" role="list">
                    {days.map((day) => (
                        <button
                            key={day.key}
                            type="button"
                            role="listitem"
                            className={`weather-board-day${day.key === activeDay ? " is-active" : ""}`}
                            onClick={() => setSelectedDay(day.key)}
                        >
                            <span className="weather-board-day-name">{day.weekday}</span>
                            <WeatherGlyph condition={day.condition} size={28} />
                            <span className="weather-board-day-temps">
                                <strong>{day.high}°</strong>
                                {day.low !== day.high ? <span>{day.low}°</span> : null}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}
