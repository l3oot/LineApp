import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import notiIcon from "../assets/icon/noti.png";
import { getGreetingPeriod } from "../utils/greeting";

type GreetingHeaderProps = {
    hasNotification?: boolean;
    onNotificationClick?: () => void;
};

export default function GreetingHeader({
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
                    <img src={notiIcon} alt="" className="greeting-noti-img" aria-hidden />
                </button>
            </div>

            <div className="greeting-header-text">
                <h1 className="greeting-title">{greeting}</h1>
                <p className="greeting-subtitle">{t("greeting.subtitle")}</p>
            </div>
        </header>
    );
}
