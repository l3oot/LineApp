import { useTranslation } from "react-i18next";
import { FaPhoneAlt } from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import "../styles/Government.css";
import { governmentContacts, isHotlineNumber, telHref } from "../data/governmentContacts";

export default function Government() {
    const { t } = useTranslation();

    return (
        <MainLayout>
            <div className="home-page">
                <div className="home-content-card">
                    <div className="government-page">
                        <section className="gov-section">
                            <h2 className="home-section-title">
                                <span className="home-section-decor home-section-decor--leaf" aria-hidden />
                                {t("government.sectionTitle")}
                            </h2>

                            <div className="gov-card-list">
                                {governmentContacts.map((contact) => {
                                    const Icon = contact.icon;
                                    return (
                                        <article key={contact.id} className={`gov-card gov-card--${contact.tone}`}>
                                            <div className="gov-card-top">
                                                <span className="gov-card-icon-wrap" aria-hidden>
                                                    <Icon size={20} />
                                                </span>
                                                <div className="gov-card-heading">
                                                    <h3 className="gov-card-agency">{contact.agency}</h3>
                                                    {contact.parentAgency && (
                                                        <p className="gov-card-parent">
                                                            {t("government.parentAgencyLabel")} {contact.parentAgency}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="gov-card-purpose">{contact.purpose}</p>

                                            {contact.phones && contact.phones.length > 0 ? (
                                                <div className="gov-card-phones">
                                                    {contact.phones.map((phone) => (
                                                        <a
                                                            key={phone}
                                                            href={telHref(phone)}
                                                            className="gov-phone-chip"
                                                        >
                                                            <FaPhoneAlt size={11} aria-hidden />
                                                            <span>{phone}</span>
                                                            {isHotlineNumber(phone) && (
                                                                <span className="gov-phone-chip-badge">
                                                                    {t("government.hotlineBadge")}
                                                                </span>
                                                            )}
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="gov-card-note">{t("government.noPhoneNote")}</p>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
