import '../styles/MainLayout.css';
import type { ReactNode } from "react";
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

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg)]">
            <main className="main-layout-content flex-1 pt-5 pb-24">
                {children}
            </main>
            <footer className="main-layout-footer fixed inset-x-0 bottom-0 z-20 px-3 py-2 shadow-[0_-10px_24px_rgba(31,42,31,0.12)]">
                <div className="mx-auto flex w-full max-w-[1080px] justify-around">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `flex min-w-16 flex-col items-center rounded-[14px] px-3 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                                        isActive
                                            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                            : "text-[var(--text-soft)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"
                                    }`
                                }
                            >
                                <Icon size={23} />
                                <p>{t(item.labelKey)}</p>
                            </NavLink>
                        );
                    })}
                </div>
            </footer>
        </div>
    );
}