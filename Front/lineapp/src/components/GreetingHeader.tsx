import { useMemo } from "react";
import { LuBell } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { getGreetingPeriod } from "../utils/greeting";

type GreetingHeaderProps = {
    hasNotification?: boolean;
    onNotificationClick?: () => void;
};

export default function GreetingHeader({
    hasNotification = true,
    onNotificationClick,
}: GreetingHeaderProps) {
    const { t } = useTranslation();

    const greeting = useMemo(() => {
        const period = getGreetingPeriod(new Date().getHours());
        return t(`greeting.${period}`);
    }, [t]);

    return (
        <header className="greeting-header">
            <div className="greeting-header-bar">
                <button
                    type="button"
                    className="greeting-icon-btn greeting-noti-btn"
                    aria-label={t("greeting.notificationAria")}
                    onClick={onNotificationClick}
                >
                    <LuBell size={20} aria-hidden />
                    {hasNotification && <span className="greeting-noti-badge" aria-hidden />}
                </button>
            </div>

            <div className="greeting-header-text">
                <h1 className="greeting-title">{greeting}</h1>
                <p className="greeting-subtitle">{t("greeting.subtitle")}</p>
            </div>
        </header>
    );
}
