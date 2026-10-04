import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LuMenu, LuX } from "react-icons/lu";
import PageMeta from "../components/PageMeta";
import { appPath } from "../lib/appPaths";
import { LINE_ADD_FRIEND_URL } from "../lib/lineOfficial";
import { resolveMarketingSeo } from "../lib/seo";
import "../styles/marketing.css";

function LineMark() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
            <path d="M12 2C6.5 2 2 5.6 2 10c0 4 3.6 7.3 8.4 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6C21.6 13.3 22 11.7 22 10c0-4.4-4.5-8-10-8Z" />
        </svg>
    );
}

const navLinks = [
    { to: "/#features", label: "ฟีเจอร์", hash: true },
    { to: "/about", label: "เกี่ยวกับ" },
    { to: "/contact", label: "ติดต่อ" },
    { to: "/terms", label: "ข้อกำหนด" },
    { to: "/privacy", label: "ความเป็นส่วนตัว" },
] as const;

type MarketingLayoutProps = {
    children?: ReactNode;
};

export default function MarketingLayout({ children }: MarketingLayoutProps) {
    const location = useLocation();
    const pageSeo = resolveMarketingSeo(location.pathname);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMenuOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [menuOpen]);

    const closeMenu = () => setMenuOpen(false);

    return (
        <div className="mk-page">
            <PageMeta {...pageSeo} />
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
                ข้ามไปยังเนื้อหาหลัก
            </a>

            <header className={`mk-header${scrolled ? " is-scrolled" : ""}`}>
                <div className="mk-shell mk-header__float">
                    <div className="mk-header__inner">
                        <Link to="/" className="mk-brand" onClick={closeMenu}>
                            <img src="/yaiphao.png" alt="ยายเภา" className="mk-brand__mark" width={36} height={36} />
                            <span className="mk-brand__text">
                                <span className="mk-brand__name">ยายเภา</span>
                                <span className="mk-brand__status">พร้อมจดรอบปลูก</span>
                            </span>
                        </Link>

                        <nav className="mk-nav" aria-label="เมนูหลัก">
                            {navLinks.map((item) =>
                                "hash" in item && item.hash ? (
                                    <a key={item.to} href={item.to}>
                                        {item.label}
                                    </a>
                                ) : (
                                    <NavLink key={item.to} to={item.to}>
                                        {item.label}
                                    </NavLink>
                                ),
                            )}
                        </nav>

                        <div className="mk-header__actions">
                            <Link to="/entrepreneur" className="mk-btn mk-btn--ghost mk-btn--entrepreneur">
                                สำหรับผู้ประกอบการ
                            </Link>
                            <Link to={appPath()} className="mk-btn mk-btn--primary">
                                เข้าใช้งาน
                            </Link>
                            <button
                                type="button"
                                className="mk-menu-btn"
                                aria-expanded={menuOpen}
                                aria-controls="mk-mobile-nav"
                                aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
                                onClick={() => setMenuOpen((v) => !v)}
                            >
                                {menuOpen ? <LuX size={22} /> : <LuMenu size={22} />}
                            </button>
                        </div>
                    </div>

                    <div
                        id="mk-mobile-nav"
                        className={`mk-drawer${menuOpen ? " is-open" : ""}`}
                        hidden={!menuOpen}
                    >
                        <nav aria-label="เมนูมือถือ">
                            {navLinks.map((item) =>
                                "hash" in item && item.hash ? (
                                    <a key={item.to} href={item.to} onClick={closeMenu}>
                                        {item.label}
                                    </a>
                                ) : (
                                    <NavLink key={item.to} to={item.to} onClick={closeMenu}>
                                        {item.label}
                                    </NavLink>
                                ),
                            )}
                            <Link
                                to="/entrepreneur"
                                className="mk-btn mk-btn--ghost"
                                style={{ marginTop: "0.35rem" }}
                                onClick={closeMenu}
                            >
                                สำหรับผู้ประกอบการ
                            </Link>
                            <a
                                href={LINE_ADD_FRIEND_URL}
                                className="mk-btn mk-btn--line"
                                style={{ marginTop: "0.5rem" }}
                                onClick={closeMenu}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <LineMark />
                                เพิ่มเพื่อนบน LINE
                            </a>
                            <Link
                                to={appPath()}
                                className="mk-btn mk-btn--primary"
                                style={{ marginTop: "0.5rem" }}
                                onClick={closeMenu}
                            >
                                เข้าใช้งานแอป
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <main id="main-content">{children ?? <Outlet />}</main>

            <footer className="mk-footer">
                <div className="mk-shell mk-footer__grid">
                    <div>
                        <p className="mk-footer__brand">ยายเภา</p>
                        <p className="mk-footer__blurb">
                            ยายเภา แอปจดรายรับรายจ่ายเกษตรง่าย ๆ ผ่าน LINE และเว็บ — รู้กำไรต่อรอบปลูกจริง
                        </p>
                    </div>
                    <div>
                        <h4>เมนู</h4>
                        <ul>
                            <li>
                                <Link to="/">หน้าแรก</Link>
                            </li>
                            <li>
                                <Link to="/about">เกี่ยวกับ</Link>
                            </li>
                            <li>
                                <Link to="/contact">ติดต่อเรา</Link>
                            </li>
                            <li>
                                <Link to="/entrepreneur">สำหรับผู้ประกอบการ</Link>
                            </li>
                            <li>
                                <Link to={appPath()}>เข้าใช้งาน</Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4>กฎหมาย</h4>
                        <ul>
                            <li>
                                <Link to="/terms">ข้อกำหนดการใช้บริการ</Link>
                            </li>
                            <li>
                                <Link to="/privacy">นโยบายความเป็นส่วนตัว</Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="mk-shell mk-footer__bottom">
                    © {new Date().getFullYear()} ยายเภา. สงวนลิขสิทธิ์.
                </div>
            </footer>
        </div>
    );
}
