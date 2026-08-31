import '../styles/MainLayout.css';
import '../styles/page-tones.css';
import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    LuChartColumn,
    LuClipboardList,
    LuHouse,
    LuSettings,
    LuSprout,
} from "react-icons/lu";
import type { IconType } from "react-icons";

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
    { to: "/", labelKey: "nav.summary", Icon: LuHouse, end: true },
    { to: "/cycle", labelKey: "nav.cycle", Icon: LuSprout },
    { to: "/analytics", labelKey: "nav.analytics", Icon: LuChartColumn },
    { to: "/list", labelKey: "nav.list", Icon: LuClipboardList },
    { to: "/settings", labelKey: "nav.settings", Icon: LuSettings },
];

function resolvePageTone(pathname: string): string {
    if (pathname.startsWith("/list") || pathname.startsWith("/analytics") || pathname.startsWith("/prices")) return "green";
    if (pathname.startsWith("/cycle") || pathname.startsWith("/government")) return "pink";
    if (pathname.startsWith("/weather")) return "blue";
    if (pathname.startsWith("/settings")) return "purple";
    return "neutral";
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { t } = useTranslation();
    const location = useLocation();

    const pageTone = resolvePageTone(location.pathname);

    return (
        <div className="min-h-screen flex flex-col">
            <main className={`main-layout-content flex-1 pb-24 page-tone page-tone--${pageTone}`}>
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
