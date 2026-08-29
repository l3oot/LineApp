import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LuMapPin } from "react-icons/lu";
import {
    weatherConditionKey,
    weatherSceneFromCondition,
    type WeatherHour,
    type WeatherScene,
} from "../lib/weatherApi";
import { formatLongDate } from "../utils/formatAppDate";
import { getGreetingPeriod } from "../utils/greeting";
import "../styles/Weather.css";

type WeatherHeroProps = {
    province?: string;
    amphoe?: string;
    weather?: WeatherHour | null;
    status: "idle" | "loading" | "ready" | "error";
};

type HeroTheme = "day" | "night";

const RAIN_DROPS = [
    { left: "6%", delay: "0s", duration: "0.72s" },
    { left: "14%", delay: "0.18s", duration: "0.84s" },
    { left: "22%", delay: "0.4s", duration: "0.7s" },
    { left: "31%", delay: "0.08s", duration: "0.9s" },
    { left: "42%", delay: "0.32s", duration: "0.76s" },
    { left: "53%", delay: "0.14s", duration: "0.82s" },
    { left: "61%", delay: "0.5s", duration: "0.68s" },
    { left: "70%", delay: "0.22s", duration: "0.88s" },
    { left: "78%", delay: "0.36s", duration: "0.74s" },
    { left: "86%", delay: "0.1s", duration: "0.8s" },
    { left: "93%", delay: "0.46s", duration: "0.78s" },
];

const SNOW_FLAKES = [
    { left: "10%", delay: "0s", duration: "3.4s", size: 5 },
    { left: "22%", delay: "0.7s", duration: "4.1s", size: 4 },
    { left: "34%", delay: "1.4s", duration: "3.2s", size: 6 },
    { left: "48%", delay: "0.3s", duration: "3.8s", size: 4 },
    { left: "61%", delay: "1.1s", duration: "4.4s", size: 5 },
    { left: "73%", delay: "0.5s", duration: "3.6s", size: 3 },
    { left: "84%", delay: "1.8s", duration: "4s", size: 5 },
    { left: "91%", delay: "0.9s", duration: "3.3s", size: 4 },
];

function placeDateLabel(
    province: string | undefined,
    amphoe: string | undefined,
    dateText: string,
    unsetLabel: string,
): string {
    const place = [province?.trim(), amphoe?.trim()].filter(Boolean).join(" ");
    if (!place) return unsetLabel;
    return `${place}, ${dateText}`;
}

function WeatherDecor({ scene, theme }: { scene: WeatherScene; theme: HeroTheme }) {
    if (scene === "overcast") {
        return (
            <>
                {theme === "night" ? (
                    <span className="weather-hero-moon weather-hero-moon--dim" />
                ) : (
                    <span className="weather-hero-sun weather-hero-sun--dim" />
                )}
                <span className="weather-hero-cloud weather-hero-cloud--a" />
                <span className="weather-hero-cloud weather-hero-cloud--b" />
                <span className="weather-hero-cloud weather-hero-cloud--c" />
            </>
        );
    }

    if (scene === "rain") {
        return (
            <>
                <span className="weather-hero-cloud weather-hero-cloud--a" />
                <span className="weather-hero-cloud weather-hero-cloud--b" />
                <span className="weather-hero-rain">
                    {RAIN_DROPS.map((drop, index) => (
                        <span
                            key={index}
                            className="weather-hero-drop"
                            style={{
                                left: drop.left,
                                animationDelay: drop.delay,
                                animationDuration: drop.duration,
                            }}
                        />
                    ))}
                </span>
            </>
        );
    }

    if (scene === "cold") {
        return (
            <>
                {theme === "night" ? (
                    <span className="weather-hero-moon" />
                ) : (
                    <span className="weather-hero-sun weather-hero-sun--pale" />
                )}
                <span className="weather-hero-snow">
                    {SNOW_FLAKES.map((flake, index) => (
                        <span
                            key={index}
                            className="weather-hero-flake"
                            style={{
                                left: flake.left,
                                width: flake.size,
                                height: flake.size,
                                animationDelay: flake.delay,
                                animationDuration: flake.duration,
                            }}
                        />
                    ))}
                </span>
            </>
        );
    }

    if (scene === "hot") {
        return (
            <>
                <span className="weather-hero-sun weather-hero-sun--hot" />
                <span className="weather-hero-haze weather-hero-haze--a" />
                <span className="weather-hero-haze weather-hero-haze--b" />
            </>
        );
    }

    if (theme === "night") {
        return (
            <>
                <span className="weather-hero-moon" />
                <span className="weather-hero-star weather-hero-star--a" />
                <span className="weather-hero-star weather-hero-star--b" />
                <span className="weather-hero-star weather-hero-star--c" />
                <span className="weather-hero-cloud weather-hero-cloud--soft" />
            </>
        );
    }

    return (
        <>
            <span className="weather-hero-sun" />
            <span className="weather-hero-cloud weather-hero-cloud--soft" />
        </>
    );
}

export default function WeatherHero({ province, amphoe, weather, status }: WeatherHeroProps) {
    const { t, i18n } = useTranslation();
    const period = getGreetingPeriod();
    const theme: HeroTheme = period === "evening" || period === "night" ? "night" : "day";
    const scene = weather ? weatherSceneFromCondition(weather.condition) ?? "clear" : "clear";
    const locationLabel = placeDateLabel(
        province,
        amphoe,
        formatLongDate(new Date(), i18n.language),
        t("weather.locationUnset"),
    );
    const temperature =
        weather != null ? `${weather.temperatureC}°` : status === "loading" ? "…" : "—";
    const humidity = weather
        ? t("weather.humidity", { value: weather.humidityPercent })
        : status === "loading"
          ? t("weather.loading")
          : t("weather.unavailable");
    const conditionKey = weather ? weatherConditionKey(weather.condition) : null;
    const conditionLabel = status === "ready" && conditionKey ? t(conditionKey) : null;

    return (
        <Link
            to="/weather"
            className={`weather-hero weather-hero--${theme} weather-hero--${scene}`}
            aria-label={t("weather.openPageAria")}
        >
            <div className="weather-hero-decor" aria-hidden>
                <WeatherDecor scene={scene} theme={theme} />
            </div>

            <div className="weather-hero-top">
                <p className="weather-hero-location">
                    <LuMapPin size={15} aria-hidden />
                    <span className="weather-hero-location-text">{locationLabel}</span>
                </p>
            </div>

            <div className="weather-hero-body">
                <p className="weather-hero-temp">{temperature}</p>
                <p className="weather-hero-meta">
                    {conditionLabel ? (
                        <span className="weather-hero-condition">{conditionLabel}</span>
                    ) : null}
                    <span className="weather-hero-humidity">{humidity}</span>
                </p>
            </div>
        </Link>
    );
}
