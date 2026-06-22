import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const quickMenuItems = [
    { to: "/list", labelKey: "sum.quickMenu.list", tone: "green" as const },
    { to: "/cycle", labelKey: "sum.quickMenu.cycle", tone: "pink" as const },
    { to: "/analytics", labelKey: "sum.quickMenu.analytics", tone: "blue" as const },
    { to: "/settings", labelKey: "sum.quickMenu.settings", tone: "purple" as const },
];

export default function QuickMenu() {
    const { t } = useTranslation();

    return (
        <section className="home-section">
            <h2 className="home-section-title">
                <span className="home-section-decor home-section-decor--leaf" aria-hidden />
                {t("sum.quickMenu.title")}
            </h2>

            <div className="quick-menu-grid">
                {quickMenuItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={`quick-menu-item quick-menu-item--${item.tone}`}
                    >
                        <span className="quick-menu-icon-slot" aria-hidden />
                        <span className="quick-menu-label">{t(item.labelKey)}</span>
                    </NavLink>
                ))}
            </div>
        </section>
    );
}
