import '../styles/MainLayout.css';
import { useState, type ReactNode } from "react";
import GreetingHeader from "../components/GreetingHeader";
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

export default function MainLayout({ children }: MainLayoutProps) {
    const { t } = useTranslation();
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [hasUnreadAnnouncement, setHasUnreadAnnouncement] = useState(true);

    return (
        <div className="min-h-screen flex flex-col">
            <GreetingHeader
                hasNotification={hasUnreadAnnouncement}
                onNotificationClick={() => {
                    setIsAnnouncementOpen(true);
                    setHasUnreadAnnouncement(false);
                }}
            />
            <AnnouncementBottomSheet
                open={isAnnouncementOpen}
                onClose={() => setIsAnnouncementOpen(false)}
            />
            <main className="main-layout-content flex-1 pb-24">
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
                                <Icon size={22} aria-hidden />
                                <span>{t(item.labelKey)}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </footer>
        </div>
    );
}