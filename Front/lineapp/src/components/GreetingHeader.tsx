import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuBell, LuUserRound } from "react-icons/lu";
import { auth } from "../lib/auth";
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
    const [avatarBroken, setAvatarBroken] = useState(false);

    const user = useMemo(() => auth.getUser(), []);
    const displayName = user?.displayName?.trim() || t("greeting.fallbackName");
    const pictureUrl = user?.pictureUrl;
    const canShowAvatar = Boolean(pictureUrl) && !avatarBroken;
    const greetingPeriod = getGreetingPeriod();

    return (
        <header className="greeting-header">
            <div className="greeting-header-identity">
                <div className="greeting-avatar" aria-hidden>
                    {canShowAvatar ? (
                        <img
                            src={pictureUrl!}
                            alt=""
                            className="greeting-avatar-img"
                            onError={() => setAvatarBroken(true)}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <LuUserRound size={22} />
                    )}
                </div>
                <div className="greeting-header-text">
                    <p className="greeting-subtitle">{t(`greeting.${greetingPeriod}`)}</p>
                    <h1 className="greeting-title">
                        {t("greeting.namedUser", { name: displayName })}
                    </h1>
                </div>
            </div>

            <button
                type="button"
                className="greeting-icon-btn greeting-noti-btn"
                aria-label={t("greeting.notificationAria")}
                onClick={onNotificationClick}
            >
                <LuBell className="greeting-noti-icon" aria-hidden />
                {hasNotification && <span className="greeting-noti-badge" aria-hidden />}
            </button>
        </header>
    );
}
