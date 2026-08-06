import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    clearLineOAuthState,
    consumePostLoginRedirect,
    parseLineCallback,
} from "../lib/lineLogin";
import { auth, exchangeLineCode, type AuthUser } from "../lib/auth";
import { ApiError } from "../lib/api";

type CallbackStatus =
    | { kind: "loading" }
    | { kind: "ok"; user: AuthUser }
    | { kind: "error"; message: string };

export default function LineCallback() {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState<CallbackStatus>({ kind: "loading" });

    useEffect(() => {
        if (auth.isAuthed()) {
            navigate(consumePostLoginRedirect() ?? "/", { replace: true });
            return;
        }

        const parsed = parseLineCallback(location.search);
        if (!parsed.ok) {
            console.warn("[LineCallback] parse failed:", parsed.message);
            setStatus({ kind: "error", message: parsed.message });
            return;
        }

        let ignore = false;
        (async () => {
            try {
                console.log("[LineCallback] Exchanging code with backend...");
                const user = await exchangeLineCode(parsed.code);
                clearLineOAuthState();
                console.log("[LineCallback] Login success:", user);
                if (ignore) return;
                setStatus({ kind: "ok", user });
                navigate(consumePostLoginRedirect() ?? "/", { replace: true });
            } catch (err) {
                console.error("[LineCallback] Login failed:", err);
                if (ignore) return;
                const message =
                    err instanceof ApiError
                        ? `${err.message}${err.typeError ? ` (${err.typeError})` : ""}`
                        : (err as Error).message;
                setStatus({ kind: "error", message });
            }
        })();

        return () => {
            ignore = true;
        };
    }, [location.search, navigate]);

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
