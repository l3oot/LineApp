import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { IconType } from "react-icons";
import { FaLandmark } from "react-icons/fa";
import { navIcons } from "../assets/icon/navIcons";

type QuickMenuTone = "green" | "pink" | "blue" | "purple";

type QuickMenuItem = {
    to: string;
    labelKey: string;
    tone: QuickMenuTone;
    icon?: string;
    Icon?: IconType;
};

const quickMenuItems: QuickMenuItem[] = [
    { to: "/list", labelKey: "sum.quickMenu.list", tone: "green", icon: navIcons.list },
    { to: "/government", labelKey: "sum.quickMenu.government", tone: "pink", Icon: FaLandmark },
    { to: "/prices", labelKey: "sum.quickMenu.prices", tone: "blue", icon: navIcons.ana },
    { to: "/settings", labelKey: "sum.quickMenu.settings", tone: "purple", icon: navIcons.setting },
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
                            {item.icon ? (
                                <img src={item.icon} alt="" className="quick-menu-icon-img" />
                            ) : item.Icon ? (
                                <item.Icon
                                    className={`quick-menu-icon-react quick-menu-icon-react--${item.tone}`}
                                    size={26}
                                />
                            ) : null}
                        </span>
                        <span className="quick-menu-label">{t(item.labelKey)}</span>
                    </NavLink>
                ))}
            </div>
        </section>
    );
}
