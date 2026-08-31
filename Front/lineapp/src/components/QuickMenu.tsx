import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaLandmark } from "react-icons/fa";
import { FiChevronRight } from "react-icons/fi";
import { LuClipboardList } from "react-icons/lu";

export default function QuickMenu() {
    const { t } = useTranslation();

    return (
        <section className="home-promo-row" aria-label={t("sum.quickMenu.title")}>
            <Link to="/government" className="price-promo-card price-promo-card--pink">
                <span className="price-promo-icon" aria-hidden>
                    <FaLandmark size={16} />
                </span>
                <div className="price-promo-copy">
                    <p className="price-promo-title">{t("sum.govPromo.title")}</p>
                    <p className="price-promo-subtitle">{t("sum.govPromo.subtitle")}</p>
                </div>
                <span className="price-promo-next" aria-hidden>
                    <FiChevronRight size={18} />
                </span>
            </Link>

            <Link to="/prices" className="price-promo-card">
                <span className="price-promo-icon" aria-hidden>
                    <LuClipboardList size={16} />
                </span>
                <div className="price-promo-copy">
                    <p className="price-promo-title">
                        {t("sum.pricePromo.title")}
                        <span className="price-promo-badge">{t("sum.pricePromo.badge")}</span>
                    </p>
                    <p className="price-promo-subtitle">{t("sum.pricePromo.subtitle")}</p>
                </div>
                <span className="price-promo-next" aria-hidden>
                    <FiChevronRight size={18} />
                </span>
            </Link>
        </section>
    );
}
