import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { navIcons } from "../assets/icon/navIcons";

const quickMenuItems = [
    { to: "/list", labelKey: "sum.quickMenu.list", tone: "green" as const, icon: navIcons.list },
    { to: "/cycle", labelKey: "sum.quickMenu.cycle", tone: "pink" as const, icon: navIcons.cycle },
    { to: "/analytics", labelKey: "sum.quickMenu.analytics", tone: "blue" as const, icon: navIcons.ana },
    { to: "/settings", labelKey: "sum.quickMenu.settings", tone: "purple" as const, icon: navIcons.setting },
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
                        <span className="quick-menu-icon-slot quick-menu-icon-slot--filled" aria-hidden>
                            <img src={item.icon} alt="" className="quick-menu-icon-img" />
                        </span>
                        <span className="quick-menu-label">{t(item.labelKey)}</span>
                    </NavLink>
                ))}
            </div>
        </section>
    );
}
