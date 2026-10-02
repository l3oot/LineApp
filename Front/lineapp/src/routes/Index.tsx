import { useEffect, useState } from "react";
import { Navigate, Outlet, createBrowserRouter, useLocation, useNavigate, useParams } from "react-router-dom";
import Sum from "../pages/Sum";
import Cycle from "../pages/Cycle";
import CycleDetail from "../pages/CycleDetail";
import Analytic from "../pages/Analytic";
import List from "../pages/List";
import Setting from "../pages/Setting";
import Government from "../pages/Government";
import Prices from "../pages/Prices";
import Weather from "../pages/Weather";
import LineCallback from "../pages/LineCallback";
import RequireAuth from "../components/RequireAuth";
import MarketingLayout from "../layouts/MarketingLayout";
import MarketingHome from "../pages/marketing/Home";
import AboutPage from "../pages/marketing/About";
import ContactPage from "../pages/marketing/Contact";
import TermsPage from "../pages/marketing/Terms";
import PrivacyPage from "../pages/marketing/Privacy";
import Entrepreneur from "../pages/Entrepreneur";
import AgriProducts from "../pages/AgriProducts";
import { APP_BASE, appPath } from "../lib/appPaths";
import { cycleApi } from "../lib/userService";

/** redirect เก่า → /app/... โดยคง query/hash (สำคัญต่อ ?editTxId=) */
function LegacyAppRedirect({ to }: { to: string }) {
    const location = useLocation();
    return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
}

/** bookmark เก่า /app/cycle/:cycleId → หน้าพืช + ?season= */
function LegacyCycleIdToCropRedirect() {
    const { cycleId = "" } = useParams();
    const navigate = useNavigate();
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!cycleId) {
            setFailed(true);
            return;
        }
        let cancelled = false;
        cycleApi
            .list()
            .then((rows) => {
                if (cancelled) return;
                const found = (rows ?? []).find((c) => c.cycleId === cycleId);
                if (found?.cropId) {
                    navigate(
                        appPath(`/cycle/crop/${found.cropId}?season=${encodeURIComponent(cycleId)}`),
                        { replace: true },
                    );
                    return;
                }
                setFailed(true);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [cycleId, navigate]);

    if (failed) {
        return <Navigate to={appPath("/cycle")} replace />;
    }
    return null;
}

function LegacyCycleDetailRedirect() {
    const { cycleId } = useParams();
    const location = useLocation();
    return (
        <Navigate
            to={`${appPath(`/cycle/${cycleId ?? ""}`)}${location.search}${location.hash}`}
            replace
        />
    );
}

export const router = createBrowserRouter([
    // Public marketing site
    {
        element: <MarketingLayout />,
        children: [
            { path: "/", element: <MarketingHome /> },
            { path: "/about", element: <AboutPage /> },
            { path: "/contact", element: <ContactPage /> },
            { path: "/terms", element: <TermsPage /> },
            { path: "/privacy", element: <PrivacyPage /> },
        ],
    },

    // /callback ต้อง public — เป็น endpoint รับ code จาก LINE
    {
        path: "/callback",
        element: <LineCallback />,
    },

    // Authenticated finance app under /app
    {
        path: APP_BASE,
        element: (
            <RequireAuth>
                <Outlet />
            </RequireAuth>
        ),
        children: [
            { index: true, element: <Sum /> },
            { path: "cycle", element: <Cycle /> },
            { path: "cycle/crop/:cropId", element: <CycleDetail /> },
            { path: "cycle/:cycleId", element: <LegacyCycleIdToCropRedirect /> },
            { path: "analytics", element: <Analytic /> },
            { path: "list", element: <List /> },
            { path: "settings", element: <Setting /> },
            { path: "government", element: <Government /> },
            { path: "prices", element: <Prices /> },
            { path: "weather", element: <Weather /> },
            { path: "entrepreneur", element: <Entrepreneur /> },
            { path: "agri-products", element: <AgriProducts /> },
        ],
    },

    // Legacy redirects (pre-/app split) — keep old bookmarks / LIFF links working
    { path: "/cycle", element: <LegacyAppRedirect to={appPath("/cycle")} /> },
    { path: "/cycle/:cycleId", element: <LegacyCycleDetailRedirect /> },
    { path: "/analytics", element: <LegacyAppRedirect to={appPath("/analytics")} /> },
    { path: "/list", element: <LegacyAppRedirect to={appPath("/list")} /> },
    { path: "/settings", element: <LegacyAppRedirect to={appPath("/settings")} /> },
    { path: "/government", element: <LegacyAppRedirect to={appPath("/government")} /> },
    { path: "/prices", element: <LegacyAppRedirect to={appPath("/prices")} /> },
    { path: "/weather", element: <LegacyAppRedirect to={appPath("/weather")} /> },
    { path: "/entrepreneur", element: <LegacyAppRedirect to={appPath("/entrepreneur")} /> },
    { path: "/agri-products", element: <LegacyAppRedirect to={appPath("/agri-products")} /> },
]);
