import { api } from "./api";
import { APP_TIME_ZONE } from "../utils/parseTxDateTime";

export type WeatherHour = {
    time: string;
    temperatureC: number;
    humidityPercent: number;
    condition: number;
    temperatureMinC?: number | null;
    temperatureMaxC?: number | null;
};

export type WeatherForecast = {
    locationLabel: string;
    province: string;
    amphoe: string | null;
    tambon: string | null;
    current: WeatherHour;
    hours: WeatherHour[];
};

export type WeatherQuery = {
    province?: string | null;
    amphoe?: string | null;
    tambon?: string | null;
    date?: string | null;
    hour?: number | string | null;
    duration?: number | string | null;
};

export function weatherConditionKey(condition: number): string | null {
    if (condition < 1 || condition > 12) {
        return null;
    }
    return `weather.condition.${condition}`;
}

export type WeatherScene = "clear" | "overcast" | "rain" | "cold" | "hot";

/** ย่อ 12 รหัสสภาพอากาศเหลือ 5 ฉากอนิเมชันบนการ์ด */
export function weatherSceneFromCondition(condition: number): WeatherScene | null {
    if (condition >= 1 && condition <= 3) return "clear";
    if (condition >= 4 && condition <= 6) return "overcast";
    if (condition >= 7 && condition <= 9) return "rain";
    if (condition >= 10 && condition <= 11) return "cold";
    if (condition === 12) return "hot";
    return null;
}

const CACHE_KEY = "weather_forecast_cache";
const DAILY_CACHE_KEY = "weather_daily_forecast_cache";
const HOURLY_CACHE_MAP_KEY = "weather_hourly_forecast_cache_map";
const CACHE_TTL_MS = 60 * 60 * 1000;

export function weatherDayKey(time: string): string | null {
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: APP_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (!year || !month || !day) return null;
    return `${year}-${month}-${day}`;
}

export function todayWeatherDayKey(): string {
    return weatherDayKey(new Date().toISOString()) ?? "";
}

type WeatherCacheEntry = {
    key: string;
    savedAt: number;
    data: WeatherForecast;
};

const inflight = new Map<string, Promise<WeatherForecast>>();
const hourlyMemory = new Map<string, WeatherCacheEntry>();

function isFresh(entry: WeatherCacheEntry | null | undefined, key: string): entry is WeatherCacheEntry {
    return Boolean(
        entry &&
            entry.key === key &&
            Number.isFinite(entry.savedAt) &&
            Date.now() - entry.savedAt <= CACHE_TTL_MS &&
            entry.data?.current,
    );
}

function readHourlyStore(): Record<string, WeatherCacheEntry> {
    try {
        const raw = localStorage.getItem(HOURLY_CACHE_MAP_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, WeatherCacheEntry>;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writeHourlyStore(store: Record<string, WeatherCacheEntry>): void {
    const fresh: Record<string, WeatherCacheEntry> = {};
    for (const [key, entry] of Object.entries(store)) {
        if (isFresh(entry, key)) {
            fresh[key] = entry;
        }
    }
    localStorage.setItem(HOURLY_CACHE_MAP_KEY, JSON.stringify(fresh));
}

function compact(value: string | number | null | undefined): string {
    if (value == null) return "";
    return String(value).trim();
}

function queryKey(query: WeatherQuery, period: "hourly" | "daily"): string {
    return [
        period,
        compact(query.province),
        compact(query.amphoe),
        compact(query.tambon),
        compact(query.date),
        compact(query.hour),
        compact(query.duration),
    ].join("|");
}

function toParams(query: WeatherQuery, period: "hourly" | "daily"): Record<string, string | number | undefined> {
    const hourValue = Number(compact(query.hour));
    const durationValue = Number(compact(query.duration));
    return {
        province: compact(query.province) || undefined,
        amphoe: compact(query.amphoe) || undefined,
        tambon: compact(query.tambon) || undefined,
        date: compact(query.date) || undefined,
        hour: period === "hourly" && compact(query.hour) !== "" && Number.isFinite(hourValue) ? hourValue : undefined,
        duration: compact(query.duration) !== "" && Number.isFinite(durationValue) ? durationValue : undefined,
    };
}

function readCache(query: WeatherQuery, period: "hourly" | "daily"): WeatherForecast | null {
    const key = queryKey(query, period);
    if (period === "hourly") {
        const mem = hourlyMemory.get(key);
        if (isFresh(mem, key)) {
            return mem.data;
        }
        const stored = readHourlyStore()[key];
        if (isFresh(stored, key)) {
            hourlyMemory.set(key, stored);
            return stored.data;
        }
        return null;
    }
    try {
        const raw = localStorage.getItem(DAILY_CACHE_KEY);
        if (!raw) return null;
        const entry = JSON.parse(raw) as WeatherCacheEntry;
        return isFresh(entry, key) ? entry.data : null;
    } catch {
        return null;
    }
}

function writeCache(query: WeatherQuery, period: "hourly" | "daily", data: WeatherForecast): void {
    try {
        const key = queryKey(query, period);
        const entry: WeatherCacheEntry = {
            key,
            savedAt: Date.now(),
            data,
        };
        if (period === "hourly") {
            hourlyMemory.set(key, entry);
            const store = readHourlyStore();
            store[key] = entry;
            writeHourlyStore(store);
            localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
            return;
        }
        localStorage.setItem(DAILY_CACHE_KEY, JSON.stringify(entry));
    } catch {
        // ignore quota / private-mode failures
    }
}

function requestForecast(query: WeatherQuery, period: "hourly" | "daily"): Promise<WeatherForecast> {
    const cached = readCache(query, period);
    if (cached) {
        return Promise.resolve(cached);
    }

    const key = queryKey(query, period);
    const pending = inflight.get(key);
    if (pending) {
        return pending;
    }

    const path = period === "daily" ? "/api/weather/forecast/daily" : "/api/weather/forecast";
    const request = api
        .get<WeatherForecast>(path, toParams(query, period), 20_000)
        .then((data) => {
            writeCache(query, period, data);
            return data;
        })
        .finally(() => {
            inflight.delete(key);
        });

    inflight.set(key, request);
    return request;
}

export const weatherApi = {
    readCached: (query: WeatherQuery) => readCache(query, "hourly"),
    forecast: (query: WeatherQuery) => requestForecast(query, "hourly"),
    dailyForecast: (query: WeatherQuery) => requestForecast(query, "daily"),
};
