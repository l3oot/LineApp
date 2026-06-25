import '../styles/MainLayout.css';
import '../styles/page-tones.css';
import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import GreetingHeader from "../components/GreetingHeader";
import CyclePageHeader from "../components/CyclePageHeader";
import AnalyticPageHeader from "../components/AnalyticPageHeader";
import ListPageHeader from "../components/ListPageHeader";
import SettingPageHeader from "../components/SettingPageHeader";
import AnnouncementBottomSheet from "../components/AnnouncementBottomSheet";
import { GoHome } from "react-icons/go";
import { GrPowerCycle } from "react-icons/gr";
import { GrAnalytics } from "react-icons/gr";
import { CiCircleList } from "react-icons/ci";
import { LuSettings } from "react-icons/lu";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

type MainLayoutProps = {
    children: ReactNode;
};

const navItems = [
    { to: "/", labelKey: "nav.summary", icon: GoHome, end: true },
    { to: "/cycle", labelKey: "nav.cycle", icon: GrPowerCycle },
    { to: "/analytics", labelKey: "nav.analytics", icon: GrAnalytics },
    { to: "/list", labelKey: "nav.list", icon: CiCircleList },
    { to: "/settings", labelKey: "nav.settings", icon: LuSettings },
];

function resolvePageTone(pathname: string): string {
    if (pathname.startsWith("/list")) return "green";
    if (pathname === "/cycle") return "pink";
    if (pathname.startsWith("/analytics")) return "blue";
    if (pathname.startsWith("/settings")) return "purple";
    return "neutral";
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { t } = useTranslation();
    const location = useLocation();
    const isCyclePage = location.pathname === "/cycle";
    const isAnalyticsPage = location.pathname === "/analytics";
    const isListPage = location.pathname === "/list";
    const isSettingsPage = location.pathname === "/settings";
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [hasUnreadAnnouncement, setHasUnreadAnnouncement] = useState(true);

    const headerProps = {
        hasNotification: hasUnreadAnnouncement,
        onNotificationClick: () => {
            setIsAnnouncementOpen(true);
            setHasUnreadAnnouncement(false);
        },
    };

    const pageTone = resolvePageTone(location.pathname);

    return (
        <div className="min-h-screen flex flex-col">
            {isCyclePage ? (
                <CyclePageHeader {...headerProps} />
            ) : isAnalyticsPage ? (
                <AnalyticPageHeader {...headerProps} />
            ) : isListPage ? (
                <ListPageHeader {...headerProps} />
            ) : isSettingsPage ? (
                <SettingPageHeader {...headerProps} />
            ) : (
                <GreetingHeader {...headerProps} />
            )}
            <AnnouncementBottomSheet
                open={isAnnouncementOpen}
                onClose={() => setIsAnnouncementOpen(false)}
            />
            <main className={`main-layout-content flex-1 pb-20 page-tone page-tone--${pageTone}`}>
                {children}
            </main>
            <footer className="main-layout-footer">
                <nav className="main-layout-footer-nav" aria-label="Main navigation">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `main-layout-nav-item${isActive ? " is-active" : ""}`
                                }
                            >
                                <span className="main-layout-nav-icon" aria-hidden>
                                    <Icon size={22} />
                                </span>
                                <span className="main-layout-nav-label">{t(item.labelKey)}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </footer>
        </div>
    );
}