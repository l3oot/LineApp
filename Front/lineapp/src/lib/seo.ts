/** SEO defaults for ยายเภา marketing site (https://yaiphao.com) */

export const SITE_URL = "https://yaiphao.com";
export const SITE_NAME = "ยายเภา";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/yaiphao.png`;

export type PageSeo = {
    title: string;
    description: string;
    path: string;
    /** default: index,follow */
    robots?: string;
    image?: string;
    /** JSON-LD objects to inject (replaces previous app json-ld) */
    jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export const DEFAULT_DESCRIPTION =
    "ยายเภา แอปจดรายรับรายจ่ายเกษตร ง่าย ๆ ผ่าน LINE และเว็บ แยกต้นทุนต่อรอบปลูก รู้กำไรจริงของฟาร์มคุณ";

export const MARKETING_SEO: Record<string, PageSeo> = {
    "/": {
        path: "/",
        title: "ยายเภา | จดรายรับรายจ่ายเกษตร รู้กำไรต่อรอบปลูก",
        description: DEFAULT_DESCRIPTION,
        jsonLd: [
            {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: SITE_NAME,
                url: SITE_URL,
                inLanguage: "th-TH",
                description: DEFAULT_DESCRIPTION,
            },
            {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: SITE_NAME,
                applicationCategory: "FinanceApplication",
                operatingSystem: "Web, LINE",
                url: SITE_URL,
                description: DEFAULT_DESCRIPTION,
                inLanguage: "th-TH",
                offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "THB",
                },
            },
            {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: SITE_NAME,
                url: SITE_URL,
                logo: DEFAULT_OG_IMAGE,
                sameAs: [],
            },
        ],
    },
    "/about": {
        path: "/about",
        title: "เกี่ยวกับยายเภา | แอปจดรายรับรายจ่ายเกษตร",
        description:
            "รู้จักยายเภา ระบบจดรายรับรายจ่ายเกษตรผ่าน LINE และเว็บ ออกแบบให้เกษตรกรเห็นกำไรจริงต่อรอบปลูก โดยไม่ต้องเป็นนักบัญชี",
    },
    "/contact": {
        path: "/contact",
        title: "ติดต่อยายเภา | สอบถามจดรายรับรายจ่ายเกษตร",
        description:
            "ติดต่อทีมยายเภา สอบถามการใช้งานจดรายรับรายจ่ายเกษตรผ่าน LINE หรือร่วมงานกับเรา",
    },
    "/terms": {
        path: "/terms",
        title: "ข้อกำหนดการใช้บริการ | ยายเภา",
        description: "ข้อกำหนดการใช้บริการของยายเภา แอปจดรายรับรายจ่ายเกษตรผ่าน LINE และเว็บ",
    },
    "/privacy": {
        path: "/privacy",
        title: "นโยบายความเป็นส่วนตัว | ยายเภา",
        description: "นโยบายความเป็นส่วนตัวของยายเภา อธิบายการเก็บ ใช้ และคุ้มครองข้อมูลเมื่อจดรายรับรายจ่ายเกษตร",
    },
};

export const APP_SEO: PageSeo = {
    path: "/app",
    title: "ยายเภา | เข้าใช้งาน",
    description: DEFAULT_DESCRIPTION,
    robots: "noindex, nofollow",
};

function upsertMeta(
    attr: "name" | "property",
    key: string,
    content: string,
) {
    const selector = `meta[${attr}="${key}"]`;
    let el = document.head.querySelector<HTMLMetaElement>(selector);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
    let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
    }
    el.setAttribute("href", href);
}

const JSON_LD_ID = "yaiphao-json-ld";

function setJsonLd(data?: Record<string, unknown> | Record<string, unknown>[]) {
    const existing = document.getElementById(JSON_LD_ID);
    if (!data) {
        existing?.remove();
        return;
    }
    const script =
        (existing as HTMLScriptElement | null) ??
        Object.assign(document.createElement("script"), {
            id: JSON_LD_ID,
            type: "application/ld+json",
        });
    script.textContent = JSON.stringify(data);
    if (!existing) document.head.appendChild(script);
}

/** Apply document title, description, OG/Twitter, canonical, robots, optional JSON-LD */
export function applyPageSeo(seo: PageSeo) {
    const url = `${SITE_URL}${seo.path === "/" ? "/" : seo.path}`;
    const image = seo.image ?? DEFAULT_OG_IMAGE;
    const robots = seo.robots ?? "index, follow";

    document.title = seo.title;
    document.documentElement.lang = "th";

    upsertMeta("name", "description", seo.description);
    upsertMeta("name", "robots", robots);
    upsertMeta("name", "googlebot", robots);
    upsertMeta("name", "keywords", "ยายเภา, จดรายรับรายจ่ายเกษตร, บัญชีฟาร์ม, กำไรต่อรอบปลูก, จดบัญชีเกษตร, LINE เกษตร");

    upsertMeta("property", "og:type", seo.path === "/" ? "website" : "article");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "th_TH");
    upsertMeta("property", "og:title", seo.title);
    upsertMeta("property", "og:description", seo.description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", image);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", seo.title);
    upsertMeta("name", "twitter:description", seo.description);
    upsertMeta("name", "twitter:image", image);

    upsertLink("canonical", url);
    setJsonLd(seo.jsonLd);
}

export function resolveMarketingSeo(pathname: string): PageSeo {
    const key = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
    return MARKETING_SEO[key] ?? {
        path: key || "/",
        title: `${SITE_NAME} | จดรายรับรายจ่ายเกษตร`,
        description: DEFAULT_DESCRIPTION,
    };
}
