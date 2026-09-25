import '../styles/MainLayout.css';
import '../styles/page-tones.css';
import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GreetingHeader from "../components/GreetingHeader";
import {
    LuChartColumn,
    LuClipboardList,
    LuHouse,
    LuSettings,
    LuSprout,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { APP_BASE, appPath } from "../lib/appPaths";

type MainLayoutProps = {
    children: ReactNode;
};

type NavItem = {
    to: string;
    labelKey: string;
    end?: boolean;
    Icon: IconType;
};

const navItems: NavItem[] = [
    { to: appPath(), labelKey: "nav.summary", Icon: LuHouse, end: true },
    { to: appPath("/cycle"), labelKey: "nav.cycle", Icon: LuSprout },
    { to: appPath("/analytics"), labelKey: "nav.analytics", Icon: LuChartColumn },
    { to: appPath("/list"), labelKey: "nav.list", Icon: LuClipboardList },
    { to: appPath("/settings"), labelKey: "nav.settings", Icon: LuSettings },
];

function resolvePageTone(pathname: string): string {
    const p = pathname.startsWith(APP_BASE) ? pathname.slice(APP_BASE.length) || "/" : pathname;
    if (p.startsWith("/list") || p.startsWith("/analytics") || p.startsWith("/prices")) return "green";
    if (p.startsWith("/cycle") || p.startsWith("/government") || p.startsWith("/entrepreneur") || p.startsWith("/agri-products")) return "pink";
    if (p.startsWith("/weather")) return "blue";
    if (p.startsWith("/settings")) return "purple";
    return "neutral";
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { t } = useTranslation();
    const location = useLocation();

    const pageTone = resolvePageTone(location.pathname);

    return (
        <div className="min-h-screen flex flex-col">
            <main className={`main-layout-content flex-1 pb-24 page-tone page-tone--${pageTone}`}>
                <div className="layout-greeting">
                    <GreetingHeader />
                </div>
                {children}
            </main>
            <footer className="main-layout-footer">
                <nav className="main-layout-footer-nav" aria-label="Main navigation">
                    {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `main-layout-nav-item${isActive ? " is-active" : ""}`
                                }
                            >
                                <span className="main-layout-nav-icon" aria-hidden>
                                    <item.Icon className="main-layout-nav-svg" />
                                </span>
                                <span className="main-layout-nav-label">{t(item.labelKey)}</span>
                            </NavLink>
                    ))}
                </nav>
            </footer>
        </div>
    );
}
