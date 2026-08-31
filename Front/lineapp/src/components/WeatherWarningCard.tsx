import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuExternalLink, LuTriangleAlert } from "react-icons/lu";
import { weatherApi, type WeatherWarning } from "../lib/weatherApi";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";

type WeatherWarningCardProps = {
    hidden?: boolean;
};

export default function WeatherWarningCard({ hidden = false }: WeatherWarningCardProps) {
    const { t } = useTranslation();
    const [data, setData] = useState<WeatherWarning | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setStatus("loading");
        setError(null);
        weatherApi
            .warning()
            .then((next) => {
                if (cancelled) return;
                setData(next);
                setStatus("ready");
            })
            .catch((err) => {
                if (cancelled) return;
                setData(null);
                setStatus("error");
                setError(getFriendlyApiErrorMessage(err, t));
            });
        return () => {
            cancelled = true;
        };
    }, [t]);

    if (hidden) {
        return null;
    }

    if (status === "loading") {
        return (
            <section className="weather-warning" aria-busy="true" aria-label={t("weather.warningTitle")}>
                <p className="weather-warning-kicker">
                    <LuTriangleAlert size={16} aria-hidden />
                    {t("weather.warningTitle")}
                </p>
                <p className="weather-warning-empty">{t("weather.warningLoading")}</p>
            </section>
        );
    }

    if (status === "error") {
        return (
            <section className="weather-warning" aria-label={t("weather.warningTitle")}>
                <p className="weather-warning-kicker">
                    <LuTriangleAlert size={16} aria-hidden />
                    {t("weather.warningTitle")}
                </p>
                <p className="weather-error">{error}</p>
            </section>
        );
    }

    if (!data?.hasWarning) {
        return (
            <section className="weather-warning" aria-label={t("weather.warningTitle")}>
                <p className="weather-warning-kicker">
                    <LuTriangleAlert size={16} aria-hidden />
                    {t("weather.warningTitle")}
                </p>
                <p className="weather-warning-empty">{t("weather.warningNone")}</p>
            </section>
        );
    }

    return (
        <section className="weather-warning weather-warning--alert" aria-label={t("weather.warningTitle")}>
            <p className="weather-warning-kicker">
                <LuTriangleAlert size={16} aria-hidden />
                {t("weather.warningTitle")}
                {data.issueNo ? <span>{t("weather.warningIssue", { issue: data.issueNo })}</span> : null}
            </p>
            {data.titleThai ? <h2 className="weather-warning-title">{data.titleThai}</h2> : null}
            {(data.effectStartDate || data.effectEndDate) && (
                <p className="weather-warning-meta">
                    {t("weather.warningEffect", {
                        start: data.effectStartDate || "—",
                        end: data.effectEndDate || "—",
                    })}
                </p>
            )}
            {data.summary ? <p className="weather-warning-summary">{data.summary}</p> : null}
            <div className="weather-warning-foot">
                {data.webUrlThai ? (
                    <a
                        className="weather-warning-link"
                        href={data.webUrlThai}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {t("weather.warningReadFull")}
                        <LuExternalLink size={14} aria-hidden />
                    </a>
                ) : null}
                {data.contactThai ? <p className="weather-warning-contact">{data.contactThai}</p> : null}
            </div>
        </section>
    );
}
