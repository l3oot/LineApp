import { useMemo } from "react";
import { LuBell } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { getGreetingIconUrl, getGreetingPeriod } from "../utils/greeting";

type GreetingHeaderProps = {
    hasNotification?: boolean;
    onNotificationClick?: () => void;
};

export default function GreetingHeader({
    hasNotification = true,
    onNotificationClick,
}: GreetingHeaderProps) {
    const { t } = useTranslation();

    const { greeting, iconUrl } = useMemo(() => {
        const now = new Date();
        const period = getGreetingPeriod(now.getHours());
        return {
            greeting: t(`greeting.${period}`),
            iconUrl: getGreetingIconUrl(now.getHours()),
        };
    }, [t]);

    return (
        <header className="greeting-header px-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold leading-tight text-[var(--text)]">
                            {greeting}
                        </h1>
                        <img
                            src={iconUrl}
                            alt=""
                            aria-hidden
                            className="h-7 w-7 shrink-0 object-contain"
                        />
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                        {t("greeting.subtitle")}
                    </p>
                </div>

                <button
                    type="button"
                    className="greeting-noti-btn"
                    aria-label={t("greeting.notificationAria")}
                    onClick={onNotificationClick}
                >
                    <LuBell size={20} aria-hidden />
                    {hasNotification && <span className="greeting-noti-badge" aria-hidden />}
                </button>
            </div>
        </header>
    );
}
