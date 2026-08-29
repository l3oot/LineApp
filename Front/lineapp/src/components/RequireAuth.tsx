import { useEffect, useState, type ReactNode } from "react";
import AppLoadingScreen from "./AppLoadingScreen";
import { auth, exchangeLiffSession } from "../lib/auth";
import {
    getLineLoginUrl,
    isLineLoginConfigured,
    isOAuthRedirectRecentlyStarted,
    markOAuthRedirectStarted,
    savePostLoginRedirect,
} from "../lib/lineLogin";
import {
    getLiffTokens,
    initLiff,
    isLiffConfigured,
    isLiffLoggedIn,
    loginWithLiff,
} from "../lib/liff";

type RequireAuthProps = {
    children: ReactNode;
};

// module-level lock — กัน effect รัน 2 รอบ (StrictMode remount) ยิง redirect ซ้ำในหน้าเดียวกัน
let redirectLock = false;

/**
 * Guard ที่:
 *  - ถ้ายัง login → redirect ไป LINE login ทันที (auto, ไม่ต้องกดปุ่ม)
 *  - ถ้า config ไม่ครบ → แสดงข้อความบอกให้ไปตั้งค่า env
 *  - ถ้า login แล้ว → render children ตามปกติ
 */
export default function RequireAuth({ children }: RequireAuthProps) {
    const [state, setState] = useState<"checking" | "redirecting" | "ready" | "misconfigured">(
        "checking",
    );

    useEffect(() => {
        let ignore = false;

        const run = async () => {
            if (auth.isAuthed()) {
                if (!ignore) setState("ready");
                return;
            }

            // /callback มีหน้าที่ exchange code เอง — ไม่ควรมาถูก guard นี้ trigger login ซ้ำ
            if (window.location.pathname.startsWith("/callback")) {
                return;
            }

            // กัน redirect ซ้ำ: ทั้ง lock ในหน่วยความจำ (StrictMode remount) และ flag ใน sessionStorage
            // (เผื่อ browser refresh/redirect ไม่สมบูรณ์ระหว่างพา user ไป LINE OAuth)
            if (redirectLock || isOAuthRedirectRecentlyStarted()) {
                if (!ignore) setState("redirecting");
                return;
            }

            const currentPath =
                window.location.pathname + window.location.search + window.location.hash;
            const forceExternalBrowser = new URLSearchParams(window.location.search).get("openExternalBrowser") === "1";

            if (isLiffConfigured() && !forceExternalBrowser) {
                const liffReady = await initLiff();
                if (liffReady) {
                    if (!isLiffLoggedIn()) {
                        savePostLoginRedirect(currentPath);
                        redirectLock = true;
                        markOAuthRedirectStarted();
                        if (!ignore) setState("redirecting");
                        loginWithLiff(window.location.href);
                        return;
                    }

                    const tokens = getLiffTokens();
                    if (tokens) {
                        try {
                            await exchangeLiffSession(tokens);
                            if (!ignore) setState("ready");
                            return;
                        } catch (err) {
                            console.warn("[RequireAuth] LIFF exchange failed, fallback to OAuth:", err);
                        }
                    }
                }
            }

            if (!isLineLoginConfigured()) {
                if (!ignore) setState("misconfigured");
                return;
            }
            const loginUrl = getLineLoginUrl();
            if (!loginUrl) {
                if (!ignore) setState("misconfigured");
                return;
            }
            savePostLoginRedirect(currentPath);
            redirectLock = true;
            markOAuthRedirectStarted();
            if (!ignore) setState("redirecting");
            // replace เพื่อไม่ให้กด back กลับเข้ามาแล้วซ้ำ effect
            window.location.replace(loginUrl);
        };

        void run();

        return () => {
            ignore = true;
        };
    }, []);

    if (state === "ready") {
        return <>{children}</>;
    }

    if (state === "checking" || state === "redirecting") {
        return <AppLoadingScreen />;
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-6">
            <section className="w-full max-w-md rounded-[var(--radius-card)] bg-[var(--surface)] p-5 text-center shadow-[var(--shadow-soft)]">
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-red-600">LINE Login ยังไม่ถูกตั้งค่า</p>
                    <p className="text-xs text-[var(--text-soft)]">
                        ตั้ง <code>VITE_LIFF_ID</code> หรือ <code>VITE_LINE_CHANNEL_ID</code> กับ <code>VITE_LINE_REDIRECT_URI</code> ใน .env
                    </p>
                </div>
            </section>
        </main>
    );
}
