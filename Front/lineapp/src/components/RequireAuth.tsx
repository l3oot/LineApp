import { useEffect, useState, type ReactNode } from "react";
import { auth } from "../lib/auth";
import { getLineLoginUrl, isLineLoginConfigured } from "../lib/lineLogin";

type RequireAuthProps = {
    children: ReactNode;
};

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
        if (auth.isAuthed()) {
            setState("ready");
            return;
        }
        if (!isLineLoginConfigured()) {
            setState("misconfigured");
            return;
        }
        const loginUrl = getLineLoginUrl();
        if (!loginUrl) {
            setState("misconfigured");
            return;
        }
        setState("redirecting");
        // replace เพื่อไม่ให้กด back กลับเข้ามาแล้วซ้ำ effect
        window.location.replace(loginUrl);
    }, []);

    if (state === "ready") {
        return <>{children}</>;
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
            <section className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 text-center shadow-[var(--shadow-soft)]">
                {state === "checking" && (
                    <p className="text-sm text-[var(--text-soft)]">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
                )}
                {state === "redirecting" && (
                    <p className="text-sm text-[var(--text-soft)]">กำลังพาไปยังหน้า LINE Login...</p>
                )}
                {state === "misconfigured" && (
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-red-600">LINE Login ยังไม่ถูกตั้งค่า</p>
                        <p className="text-xs text-[var(--text-soft)]">
                            กรุณาตั้ง <code>VITE_LINE_CHANNEL_ID</code> และ <code>VITE_LINE_REDIRECT_URI</code> ใน .env
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}
