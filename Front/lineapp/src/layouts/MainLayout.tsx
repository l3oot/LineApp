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
import { navIcons } from "../assets/icon/navIcons";
import type { IconType } from "react-icons";
import { CiCircleList } from "react-icons/ci";
import { LuSettings } from "react-icons/lu";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

type MainLayoutProps = {
    children: ReactNode;
};

type NavItem = {
    to: string;
    labelKey: string;
    end?: boolean;
    src?: string;
    Icon?: IconType;
};

const navItems: NavItem[] = [
    { to: "/", labelKey: "nav.summary", src: navIcons.home, end: true },
    { to: "/cycle", labelKey: "nav.cycle", src: navIcons.cycle },
    { to: "/analytics", labelKey: "nav.analytics", src: navIcons.ana },
    { to: "/list", labelKey: "nav.list", Icon: CiCircleList },
    { to: "/settings", labelKey: "nav.settings", Icon: LuSettings },
];

function NavIcon({ src, Icon }: { src?: string; Icon?: IconType }) {
    if (src) {
        return <img src={src} alt="" className="main-layout-nav-img" />;
    }
    if (Icon) {
        return <Icon size={22} />;
    }
    return null;
}

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
                                    <NavIcon src={item.src} Icon={item.Icon} />
                                </span>
                                <span className="main-layout-nav-label">{t(item.labelKey)}</span>
                            </NavLink>
                    ))}
                </nav>
            </footer>
        </div>
    );
}