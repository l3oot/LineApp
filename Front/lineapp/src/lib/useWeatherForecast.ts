import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    isHourlyForecastDate,
    todayWeatherDayKey,
    weatherApi,
    weatherDayKey,
    type WeatherForecast,
    type WeatherHour,
    type WeatherQuery,
} from "./weatherApi";
import { userProfileApi } from "./userService";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";
import { auth } from "./auth";

export type WeatherLoadStatus = "idle" | "loading" | "ready" | "error";

type UseWeatherForecastOptions = {
    period?: "hourly" | "daily";
};

export function useWeatherForecast(options?: UseWeatherForecastOptions) {
    const daily = options?.period === "daily";
    const { t } = useTranslation();
    const [province, setProvince] = useState("");
    const [amphoe, setAmphoe] = useState("");
    const [tambon, setTambon] = useState("");
    const [forecast, setForecast] = useState<WeatherForecast | null>(null);
    const [status, setStatus] = useState<WeatherLoadStatus>("loading");
    const [error, setError] = useState<string | null>(null);
    const requestId = useRef(0);
    const userSearched = useRef(false);

    const search = useCallback(
        async (query: WeatherQuery, fromProfile = false) => {
            if (!auth.isAuthed()) {
                setStatus("idle");
                return;
            }
            if (!fromProfile) {
                userSearched.current = true;
            } else if (userSearched.current) {
                return;
            }
            const id = ++requestId.current;
            setStatus("loading");
            setError(null);
            try {
                const data = daily ? await weatherApi.dailyForecast(query) : await weatherApi.forecast(query);
                if (id !== requestId.current) return;
                setForecast(data);
                setStatus("ready");
            } catch (err) {
                if (id !== requestId.current) return;
                setForecast(null);
                setStatus("error");
                setError(getFriendlyApiErrorMessage(err, t));
            }
        },
        [daily, t],
    );

    useEffect(() => {
        if (!auth.isAuthed()) {
            setStatus("idle");
            return;
        }

        let cancelled = false;
        setStatus("loading");
        setError(null);

        userProfileApi
            .get()
            .then((profile) => {
                const nextProvince = profile?.province?.trim() ?? "";
                const nextAmphoe = profile?.district?.trim() ?? "";
                const nextTambon = profile?.subDistrict?.trim() ?? "";
                if (cancelled) return;
                setProvince(nextProvince);
                setAmphoe(nextAmphoe);
                setTambon(nextTambon);
                if (!nextProvince && !nextAmphoe && !nextTambon) {
                    if (!userSearched.current) {
                        setForecast(null);
                        setStatus("idle");
                    }
                    return;
                }
                return search(
                    {
                        province: nextProvince || undefined,
                        amphoe: nextAmphoe || undefined,
                        tambon: nextTambon || undefined,
                        duration: daily ? 7 : undefined,
                    },
                    true,
                );
            })
            .catch((err) => {
                if (cancelled || userSearched.current) return;
                setForecast(null);
                setStatus("error");
                setError(getFriendlyApiErrorMessage(err, t));
            });

        return () => {
            cancelled = true;
        };
    }, [search, t]);

    const locationLabel = forecast?.locationLabel || [tambon, amphoe, province].filter(Boolean).join(" · ");

    return { province, amphoe, tambon, forecast, status, error, locationLabel, search };
}

function mergeSeries(forecast: WeatherForecast | null): WeatherHour[] {
    if (!forecast) return [];
    return [forecast.current, ...forecast.hours.filter((hour) => hour.time !== forecast.current.time)].sort((a, b) =>
        a.time.localeCompare(b.time),
    );
}

function hoursOnDay(forecast: WeatherForecast | null, dayKey: string): WeatherHour[] {
    return mergeSeries(forecast).filter((hour) => weatherDayKey(hour.time) === dayKey);
}

function hourlyQuery(place: WeatherQuery, date: string): WeatherQuery {
    return { ...place, date, hour: 0, duration: 24 };
}

export function useWeatherPageData() {
    const { t } = useTranslation();
    const [province, setProvince] = useState("");
    const [amphoe, setAmphoe] = useState("");
    const [tambon, setTambon] = useState("");
    const [hourly, setHourly] = useState<WeatherForecast | null>(null);
    const [daily, setDaily] = useState<WeatherForecast | null>(null);
    const [hourlyByDate, setHourlyByDate] = useState<Record<string, WeatherHour[]>>({});
    const [hourlyLoadingDate, setHourlyLoadingDate] = useState<string | null>(null);
    const [status, setStatus] = useState<WeatherLoadStatus>("loading");
    const [error, setError] = useState<string | null>(null);
    const placeRef = useRef<WeatherQuery | null>(null);
    const hourlyByDateRef = useRef<Record<string, WeatherHour[]>>({});
    const hourlyInflight = useRef(new Set<string>());
    const aliveRef = useRef(true);

    const loadHourlyDay = useCallback(async (date: string) => {
        const place = placeRef.current;
        if (!place || !date || date in hourlyByDateRef.current || hourlyInflight.current.has(date)) {
            return;
        }
        if (!isHourlyForecastDate(date)) {
            hourlyByDateRef.current = { ...hourlyByDateRef.current, [date]: [] };
            setHourlyByDate(hourlyByDateRef.current);
            return;
        }
        hourlyInflight.current.add(date);
        setHourlyLoadingDate(date);
        try {
            const data = await weatherApi.forecast(hourlyQuery(place, date));
            if (!aliveRef.current) return;
            const hours = hoursOnDay(data, date);
            hourlyByDateRef.current = { ...hourlyByDateRef.current, [date]: hours };
            setHourlyByDate(hourlyByDateRef.current);
            if (date === todayWeatherDayKey()) {
                setHourly(data);
            }
        } catch {
            if (!aliveRef.current) return;
        } finally {
            hourlyInflight.current.delete(date);
            if (aliveRef.current) {
                setHourlyLoadingDate((current) => (current === date ? null : current));
            }
        }
    }, []);

    useEffect(() => {
        if (!auth.isAuthed()) {
            setStatus("idle");
            return;
        }

        let cancelled = false;
        aliveRef.current = true;
        setStatus("loading");
        setError(null);

        userProfileApi
            .get()
            .then(async (profile) => {
                const nextProvince = profile?.province?.trim() ?? "";
                const nextAmphoe = profile?.district?.trim() ?? "";
                const nextTambon = profile?.subDistrict?.trim() ?? "";
                if (cancelled) return;
                setProvince(nextProvince);
                setAmphoe(nextAmphoe);
                setTambon(nextTambon);
                if (!nextProvince && !nextAmphoe && !nextTambon) {
                    placeRef.current = null;
                    setHourly(null);
                    setDaily(null);
                    hourlyByDateRef.current = {};
                    setHourlyByDate({});
                    setStatus("idle");
                    return;
                }
                const place: WeatherQuery = {
                    province: nextProvince || undefined,
                    amphoe: nextAmphoe || undefined,
                    tambon: nextTambon || undefined,
                };
                placeRef.current = place;
                const today = todayWeatherDayKey();
                const [hourlyResult, dailyResult] = await Promise.allSettled([
                    weatherApi.forecast(hourlyQuery(place, today)),
                    weatherApi.dailyForecast({ ...place, duration: 7 }),
                ]);
                if (cancelled) return;
                const nextHourly = hourlyResult.status === "fulfilled" ? hourlyResult.value : null;
                const nextDaily = dailyResult.status === "fulfilled" ? dailyResult.value : null;
                setHourly(nextHourly);
                setDaily(nextDaily);
                const todayHours = hoursOnDay(nextHourly, today);
                hourlyByDateRef.current = nextHourly ? { [today]: todayHours } : {};
                setHourlyByDate(hourlyByDateRef.current);
                if (!nextHourly && !nextDaily) {
                    const failed =
                        hourlyResult.status === "rejected"
                            ? hourlyResult.reason
                            : dailyResult.status === "rejected"
                              ? dailyResult.reason
                              : null;
                    setStatus("error");
                    setError(getFriendlyApiErrorMessage(failed, t));
                    return;
                }
                setStatus("ready");
                const extraDays = mergeSeries(nextDaily)
                    .map((row) => weatherDayKey(row.time))
                    .filter((day): day is string => Boolean(day) && day !== today && isHourlyForecastDate(day));
                extraDays.forEach((day) => {
                    void loadHourlyDay(day);
                });
            })
            .catch((err) => {
                if (cancelled) return;
                setHourly(null);
                setDaily(null);
                hourlyByDateRef.current = {};
                setHourlyByDate({});
                setStatus("error");
                setError(getFriendlyApiErrorMessage(err, t));
            });

        return () => {
            cancelled = true;
            aliveRef.current = false;
        };
    }, [loadHourlyDay, t]);

    const locationLabel =
        hourly?.locationLabel || daily?.locationLabel || [tambon, amphoe, province].filter(Boolean).join(" · ");

    return {
        hourly,
        daily,
        hourlyHours: mergeSeries(hourly),
        dailyHours: mergeSeries(daily),
        hourlyByDate,
        hourlyLoadingDate,
        ensureHourlyDay: loadHourlyDay,
        status,
        error,
        locationLabel,
    };
}
