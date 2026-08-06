import '../styles/MainLayout.css';
import '../styles/page-tones.css';
import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { navIcons } from "../assets/icon/navIcons";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

type MainLayoutProps = {
    children: ReactNode;
};

type NavItem = {
    to: string;
    labelKey: string;
    end?: boolean;
    src: string;
};

const navItems: NavItem[] = [
    { to: "/", labelKey: "nav.summary", src: navIcons.home, end: true },
    { to: "/cycle", labelKey: "nav.cycle", src: navIcons.cycle },
    { to: "/analytics", labelKey: "nav.analytics", src: navIcons.ana },
    { to: "/list", labelKey: "nav.list", src: navIcons.list },
    { to: "/settings", labelKey: "nav.settings", src: navIcons.setting },
];

function NavIcon({ src }: { src: string }) {
    return <img src={src} alt="" className="main-layout-nav-img" />;
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

    const pageTone = resolvePageTone(location.pathname);

    return (
        <div className="min-h-screen flex flex-col">
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
                                    <NavIcon src={item.src} />
                                </span>
                                <span className="main-layout-nav-label">{t(item.labelKey)}</span>
                            </NavLink>
                    ))}
                </nav>
            </footer>
        </div>
    );
}