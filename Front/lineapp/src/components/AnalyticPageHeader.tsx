import { LuBell } from "react-icons/lu";
import { useTranslation } from "react-i18next";

type AnalyticPageHeaderProps = {
    hasNotification?: boolean;
    onNotificationClick?: () => void;
};

export default function AnalyticPageHeader({
    hasNotification = true,
    onNotificationClick,
}: AnalyticPageHeaderProps) {
    const { t } = useTranslation();

    return (
        <header className="subpage-header">
            <div className="subpage-header-bar">
                <button
                    type="button"
                    className="subpage-icon-btn subpage-noti-btn"
                    aria-label={t("greeting.notificationAria")}
                    onClick={onNotificationClick}
                >
                    <LuBell size={20} aria-hidden />
                    {hasNotification && <span className="subpage-noti-badge" aria-hidden />}
                </button>
            </div>

            <div className="subpage-header-text">
                <h1 className="subpage-title">{t("analytic.pageTitle")}</h1>
                <p className="subpage-subtitle">{t("analytic.pageSubtitle")}</p>
            </div>
        </header>
    );
}
