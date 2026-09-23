import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LuMenu, LuX } from "react-icons/lu";
import { appPath } from "../lib/appPaths";
import "../styles/marketing.css";

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
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
                ข้ามไปยังเนื้อหาหลัก
            </a>

            <header className={`mk-header${scrolled ? " is-scrolled" : ""}`}>
                <div className="mk-shell mk-header__inner">
                    <Link to="/" className="mk-brand" onClick={closeMenu}>
                        <img src="/yaiphao.png" alt="" className="mk-brand__mark" width={36} height={36} />
                        <span className="mk-brand__name">ยายเภา</span>
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
                    className={`mk-shell mk-drawer${menuOpen ? " is-open" : ""}`}
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
                        <Link to={appPath()} className="mk-btn mk-btn--primary" style={{ marginTop: "0.5rem" }} onClick={closeMenu}>
                            เข้าใช้งานแอป
                        </Link>
                    </nav>
                </div>
            </header>

            <main id="main-content">{children ?? <Outlet />}</main>

            <footer className="mk-footer">
                <div className="mk-shell mk-footer__grid">
                    <div>
                        <p className="mk-footer__brand">ยายเภา</p>
                        <p className="mk-footer__blurb">
                            จดรายรับ-รายจ่ายการเกษตรง่าย ๆ ผ่าน LINE และเว็บ — รู้กำไรต่อรอบปลูกจริง
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
