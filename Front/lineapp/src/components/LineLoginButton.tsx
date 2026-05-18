import { useTranslation } from "react-i18next";
import { SiLine } from "react-icons/si";
import { getLineLoginUrl, isLineLoginConfigured } from "../lib/lineLogin";

type LineLoginButtonProps = {
    className?: string;
};

export default function LineLoginButton({ className = "" }: LineLoginButtonProps) {
    const { t } = useTranslation();
    const configured = isLineLoginConfigured();

    return (
        <div className={`flex w-full flex-col gap-1.5 ${className}`}>
            <button
                type="button"
                disabled={!configured}
                onClick={() => {
                    const target = getLineLoginUrl();
                    if (target) window.location.assign(target);
                }}
                className="flex w-full min-h-[48px] items-center justify-center gap-2.5 rounded-[var(--radius-control)] bg-[#06C755] px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#05b34c] active:bg-[#049948] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#06C755]"
            >
                <SiLine className="h-6 w-6 shrink-0" aria-hidden />
                {t("settings.lineLogin")}
            </button>
            {!configured && (
                <p className="px-0.5 text-center text-xs text-[var(--text-soft)]">
                    {t("settings.lineLoginNotConfigured")}
                </p>
            )}
        </div>
    );
}
