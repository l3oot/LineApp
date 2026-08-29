import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainLayout from "../layouts/MainLayout";
import AppLoadingScreen from "../components/AppLoadingScreen";
import WeatherBoard from "../components/WeatherBoard";
import { useWeatherPageData } from "../lib/useWeatherForecast";
import "../styles/Weather.css";

export default function Weather() {
    const { t } = useTranslation();
    const { hourly, daily, dailyHours, hourlyByDate, hourlyLoadingDate, ensureHourlyDay, status, error, locationLabel } =
        useWeatherPageData();
    const current = hourly?.current ?? daily?.current ?? null;
    const hasBoard = Boolean(current && (dailyHours.length > 0 || Object.keys(hourlyByDate).length > 0));

    if (status === "loading") {
        return <AppLoadingScreen label={t("weather.loading")} />;
    }

    return (
        <MainLayout>
            <div className="home-page">
                <div className="home-content-card">
                    <div className="weather-page">
                        {status === "idle" && !hasBoard && (
                            <section className="weather-card">
                                <p className="weather-empty">{t("weather.needLocation")}</p>
                                <Link to="/settings" className="weather-settings-link">
                                    {t("weather.setLocation")}
                                </Link>
                            </section>
                        )}

                        {error && <p className="weather-error">{error}</p>}

                        {status === "ready" && !hasBoard && !error && (
                            <p className="weather-empty">{t("weather.empty")}</p>
                        )}

                        {hasBoard && current && (
                            <WeatherBoard
                                locationLabel={locationLabel}
                                current={current}
                                daily={dailyHours}
                                hourlyByDate={hourlyByDate}
                                hourlyLoadingDate={hourlyLoadingDate}
                                onNeedHourlyDay={ensureHourlyDay}
                            />
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
