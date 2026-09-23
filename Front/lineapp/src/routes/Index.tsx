import { Navigate, Outlet, createBrowserRouter, useParams } from "react-router-dom";
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
import { APP_BASE, appPath } from "../lib/appPaths";

function LegacyCycleDetailRedirect() {
    const { cycleId } = useParams();
    return <Navigate to={appPath(`/cycle/${cycleId ?? ""}`)} replace />;
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
            { path: "cycle/:cycleId", element: <CycleDetail /> },
            { path: "analytics", element: <Analytic /> },
            { path: "list", element: <List /> },
            { path: "settings", element: <Setting /> },
            { path: "government", element: <Government /> },
            { path: "prices", element: <Prices /> },
            { path: "weather", element: <Weather /> },
        ],
    },

    // Legacy redirects (pre-/app split) — keep old bookmarks / LIFF links working
    { path: "/cycle", element: <Navigate to={appPath("/cycle")} replace /> },
    { path: "/cycle/:cycleId", element: <LegacyCycleDetailRedirect /> },
    { path: "/analytics", element: <Navigate to={appPath("/analytics")} replace /> },
    { path: "/list", element: <Navigate to={appPath("/list")} replace /> },
    { path: "/settings", element: <Navigate to={appPath("/settings")} replace /> },
    { path: "/government", element: <Navigate to={appPath("/government")} replace /> },
    { path: "/prices", element: <Navigate to={appPath("/prices")} replace /> },
    { path: "/weather", element: <Navigate to={appPath("/weather")} replace /> },
]);
