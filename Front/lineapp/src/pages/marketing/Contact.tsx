import { useState, type FormEvent } from "react";
import AssetPlaceholder from "../../components/marketing/AssetPlaceholder";
import lineQr from "../../assets/index/L_gainfriends_2dbarcodes_GW.png";

const CONTACT_EMAIL = "chutiman222@gmail.com";
const LINE_ADD_FRIEND_URL = "https://lin.ee/wOCf6Qe";

export default function ContactPage() {
    const [sent, setSent] = useState(false);

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const name = String(data.get("name") ?? "").trim();
        const email = String(data.get("email") ?? "").trim();
        const message = String(data.get("message") ?? "").trim();

        const subject = encodeURIComponent(`[ยายเภา] ข้อความจาก ${name}`);
        const body = encodeURIComponent(
            `ชื่อ: ${name}\nอีเมล: ${email}\n\nข้อความ:\n${message}`,
        );
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
        setSent(true);
    };

    return (
        <div className="mk-content">
            <div className="mk-shell">
                <h1 className="mk-content__title">ติดต่อเรา</h1>
                <p className="mk-content__meta">มีคำถาม ข้อเสนอแนะ หรืออยากร่วมงาน — บอกยายมาได้เลย</p>

                <div className="mk-contact-cards">
                    <div className="mk-contact-card">
                        <h3>อีเมล</h3>
                        <p>
                            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                        </p>
                    </div>
                    <div className="mk-contact-card">
                        <h3>LINE Official</h3>
                        <p>เพิ่มเพื่อนยายเภาบน LINE เพื่อสอบถามหรือเริ่มจดบัญชี</p>
                        <p style={{ marginTop: "0.5rem" }}>
                            <a
                                href={LINE_ADD_FRIEND_URL}
                                className="mk-btn mk-btn--line"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                เพิ่มเพื่อนบน LINE
                            </a>
                        </p>
                    </div>
                </div>

                <div className="mk-split">
                    <div>
                        <h2 style={{ fontFamily: "var(--font-mali)", fontSize: "1.45rem", margin: "0 0 1rem" }}>
                            ส่งข้อความถึงเรา
                        </h2>
                        {sent ? (
                            <div className="mk-prose">
                                <p style={{ color: "var(--mk-leaf-deep)" }}>
                                    เปิดแอปอีเมลให้แล้ว — ส่งถึง {CONTACT_EMAIL} ได้เลย
                                </p>
                                <button
                                    type="button"
                                    className="mk-btn mk-btn--ghost"
                                    onClick={() => setSent(false)}
                                >
                                    เขียนข้อความใหม่
                                </button>
                            </div>
                        ) : (
                            <form className="mk-form" onSubmit={onSubmit}>
                                <div className="mk-field">
                                    <label htmlFor="contact-name">ชื่อ</label>
                                    <input id="contact-name" name="name" type="text" required autoComplete="name" />
                                </div>
                                <div className="mk-field">
                                    <label htmlFor="contact-email">อีเมล</label>
                                    <input
                                        id="contact-email"
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                                <div className="mk-field">
                                    <label htmlFor="contact-message">ข้อความ</label>
                                    <textarea id="contact-message" name="message" required />
                                </div>
                                <button type="submit" className="mk-btn mk-btn--primary">
                                    ส่งข้อความ
                                </button>
                            </form>
                        )}
                    </div>

                    <a
                        href={LINE_ADD_FRIEND_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="สแกน QR หรือเปิดลิงก์เพิ่มเพื่อน LINE"
                    >
                        <AssetPlaceholder
                            aspect="auto"
                            src={lineQr}
                            framed={false}
                            label="QR Code เพิ่มเพื่อนยายเภาบน LINE"
                        />
                    </a>
                </div>
            </div>
        </div>
    );
}
