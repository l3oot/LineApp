import { LuBell } from "react-icons/lu";
import { useTranslation } from "react-i18next";

type CyclePageHeaderProps = {
    hasNotification?: boolean;
    onNotificationClick?: () => void;
};

export default function CyclePageHeader({
    hasNotification = true,
    onNotificationClick,
}: CyclePageHeaderProps) {
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
                <h1 className="subpage-title">{t("cycle.pageTitle")}</h1>
                <p className="subpage-subtitle">{t("cycle.pageSubtitle")}</p>
            </div>
        </header>
    );
}
