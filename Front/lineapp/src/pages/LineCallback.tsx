import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    clearLineOAuthState,
    collectLineCallbackDebug,
    consumePostLoginRedirect,
    dumpLineCallbackDebug,
    formatLineCallbackDebug,
    parseLineCallback,
} from "../lib/lineLogin";
import { auth, exchangeLineCode, tryCompleteLiffSession, type AuthUser } from "../lib/auth";
import { collectLiffStatus, dumpLiffStatus, hasPendingLiffLogin } from "../lib/liff";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";

type CallbackStatus =
    | { kind: "loading" }
    | { kind: "ok"; user: AuthUser }
    | { kind: "error"; message: string; debug?: string };

// กัน StrictMode เด้ง alert สองครั้งด้วย search เดียวกัน
let lastInvalidStateAlertKey = "";

function buildCallbackDebug(extra?: Record<string, unknown>): string {
    const dump = {
        ...collectLineCallbackDebug(extra),
        ...Object.fromEntries(
            Object.entries(collectLiffStatus()).map(([key, value]) => [`liff.${key}`, value]),
        ),
    };
    return formatLineCallbackDebug(dump);
}

export function LineCallback() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState<CallbackStatus>({ kind: "loading" });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let ignore = false;

        const finish = (user: AuthUser) => {
            if (ignore) return;
            setStatus({ kind: "ok", user });
            navigate(consumePostLoginRedirect() ?? "/", { replace: true });
        };

        const run = async () => {
            dumpLineCallbackDebug("[LineCallback] start", {
                pendingLiffLogin: hasPendingLiffLogin(),
                alreadyAuthed: auth.isAuthed(),
            });

            if (auth.isAuthed()) {
                console.log("[LineCallback] already authed, skipping exchange");
                navigate(consumePostLoginRedirect() ?? "/", { replace: true });
                return;
            }

            // เส้นเว็บ OAuth: state ตรงกับที่เก็บไว้ — ห้าม init LIFF (จะชิง code)
            const parsed = parseLineCallback(location.search);
            if (parsed.ok) {
                try {
                    console.log("[LineCallback] Exchanging code with backend...");
                    const user = await exchangeLineCode(parsed.code);
                    clearLineOAuthState();
                    console.log("[LineCallback] Login success:", user);
                    finish(user);
                } catch (err) {
                    console.error("[LineCallback] Login failed:", err);
                    if (ignore) return;
                    setStatus({ kind: "error", message: getFriendlyApiErrorMessage(err, t) });
                }
                return;
            }

            // เส้น LIFF ที่หลุดมา /callback (มี loginTmp หรือ code จาก LIFF โดยไม่มี line_oauth_state)
            dumpLiffStatus("[LineCallback] trying LIFF complete", { parseReason: parsed.reason });
            try {
                const liffUser = await tryCompleteLiffSession();
                if (liffUser) {
                    console.log("[LineCallback] LIFF login completed:", liffUser);
                    finish(liffUser);
                    return;
                }
                console.warn("[LineCallback] LIFF complete returned null");
            } catch (err) {
                console.error("[LineCallback] LIFF complete failed:", err);
                if (ignore) return;
                setStatus({ kind: "error", message: getFriendlyApiErrorMessage(err, t) });
                return;
            }

            if (ignore) return;
            dumpLineCallbackDebug("[LineCallback] parse failed", {
                parseReason: parsed.reason,
                parseMessage: parsed.message,
            });

            const debug = buildCallbackDebug({
                parseReason: parsed.reason,
                parseMessage: parsed.message,
            });
            clearLineOAuthState();

            if (parsed.reason === "invalid_state") {
                const alertKey = location.search;
                if (lastInvalidStateAlertKey !== alertKey) {
                    lastInvalidStateAlertKey = alertKey;
                    window.alert(`${parsed.message}\n\n${debug}`);
                }
            }

            setStatus({ kind: "error", message: parsed.message, debug });
        };

        void run();

        return () => {
            ignore = true;
        };
    }, [location.search, navigate, t]);

    const copyDebug = async () => {
        if (status.kind !== "error" || !status.debug) {
            return;
        }
        try {
            await navigator.clipboard.writeText(`${status.message}\n\n${status.debug}`);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            window.alert(`${status.message}\n\n${status.debug}`);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center p-6">
            <section className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
                <h1 className="text-lg font-semibold text-[var(--text)]">LINE Callback</h1>

                {status.kind === "loading" && (
                    <p className="mt-3 text-sm text-[var(--text-soft)]">
                        กำลังเข้าสู่ระบบ...
                    </p>
                )}

                {status.kind === "ok" && (
                    <div className="mt-3 space-y-3">
                        <p className="text-sm text-[var(--text)]">
                            ยินดีต้อนรับ {status.user.displayName}
                        </p>
                        <p className="text-xs text-[var(--text-soft)]">
                            กำลังพาไปหน้าหลัก...
                        </p>
                    </div>
                )}

                {status.kind === "error" && (
                    <div className="mt-3 space-y-3">
                        <p className="text-sm text-red-600">{status.message}</p>
                        {status.debug && (
                            <div className="space-y-2">
                                <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-[var(--radius-control)] bg-[var(--surface-soft)] p-3 text-[11px] leading-4 text-[var(--text)]">
                                    {status.debug}
                                </pre>
                                <button
                                    type="button"
                                    onClick={() => void copyDebug()}
                                    className="inline-flex rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)]"
                                >
                                    {copied ? "คัดลอกแล้ว" : "คัดลอก dump"}
                                </button>
                            </div>
                        )}
                        <Link
                            to="/settings"
                            className="inline-flex rounded-[var(--radius-control)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
                        >
                            กลับไปหน้า Settings
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}

export default LineCallback;
