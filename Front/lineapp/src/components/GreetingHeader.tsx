import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuCoins, LuUserRound } from "react-icons/lu";
import { auth } from "../lib/auth";
import { COIN_WALLET_CHANGED_EVENT, coinApi } from "../lib/userService";
import { getGreetingPeriod } from "../utils/greeting";

export default function GreetingHeader() {
    const { t, i18n } = useTranslation();
    const [avatarBroken, setAvatarBroken] = useState(false);
    const [coinBalance, setCoinBalance] = useState(0);

    const user = useMemo(() => auth.getUser(), []);
    const displayName = user?.displayName?.trim() || t("greeting.fallbackName");
    const pictureUrl = user?.pictureUrl;
    const canShowAvatar = Boolean(pictureUrl) && !avatarBroken;
    const greetingPeriod = getGreetingPeriod();
    const coinLabel = coinBalance.toLocaleString(
        i18n.language.startsWith("en") ? "en-US" : i18n.language.startsWith("jp") ? "ja-JP" : "th-TH",
    );

    useEffect(() => {
        let cancelled = false;

        const loadWallet = () => {
            if (!auth.isAuthed()) {
                if (!cancelled) setCoinBalance(0);
                return;
            }
            coinApi
                .getWallet()
                .then((wallet) => {
                    if (!cancelled) setCoinBalance(wallet.balance ?? 0);
                })
                .catch(() => {
                    if (!cancelled) setCoinBalance(0);
                });
        };

        loadWallet();
        window.addEventListener(COIN_WALLET_CHANGED_EVENT, loadWallet);
        return () => {
            cancelled = true;
            window.removeEventListener(COIN_WALLET_CHANGED_EVENT, loadWallet);
        };
    }, []);

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

            <div
                className="greeting-coin"
                aria-label={t("greeting.coinAria", { count: coinBalance })}
            >
                <LuCoins className="greeting-coin-icon" aria-hidden />
                <span className="greeting-coin-value">{coinLabel}</span>
            </div>
        </header>
    );
}
