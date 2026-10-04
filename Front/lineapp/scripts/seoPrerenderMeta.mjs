/**
 * After Vite build: write marketing route HTML shells with page-specific
 * title/description/canonical/OG so crawlers that don't run JS still see
 * the right meta (about/, contact/, terms/, privacy/).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const site = "https://yaiphao.com";

const pages = [
    {
        route: "about",
        title: "เกี่ยวกับยายเภา | แอปจดรายรับรายจ่ายเกษตร",
        description:
            "รู้จักยายเภา ระบบจดรายรับรายจ่ายเกษตรผ่าน LINE และเว็บ ออกแบบให้เกษตรกรเห็นกำไรจริงต่อรอบปลูก โดยไม่ต้องเป็นนักบัญชี",
    },
    {
        route: "contact",
        title: "ติดต่อยายเภา | สอบถามจดรายรับรายจ่ายเกษตร",
        description:
            "ติดต่อทีมยายเภา สอบถามการใช้งานจดรายรับรายจ่ายเกษตรผ่าน LINE หรือร่วมงานกับเรา",
    },
    {
        route: "terms",
        title: "ข้อกำหนดการใช้บริการ | ยายเภา",
        description: "ข้อกำหนดการใช้บริการของยายเภา แอปจดรายรับรายจ่ายเกษตรผ่าน LINE และเว็บ",
    },
    {
        route: "privacy",
        title: "นโยบายความเป็นส่วนตัว | ยายเภา",
        description:
            "นโยบายความเป็นส่วนตัวของยายเภา อธิบายการเก็บ ใช้ และคุ้มครองข้อมูลเมื่อจดรายรับรายจ่ายเกษตร",
    },
];

function replaceMeta(html, { route, title, description }) {
    const url = `${site}/${route}`;
    let out = html;
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
    out = out.replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
        `<meta name="description" content="${description}" />`,
    );
    out = out.replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
        `<link rel="canonical" href="${url}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
        `<meta property="og:title" content="${title}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
        `<meta property="og:description" content="${description}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
        `<meta property="og:url" content="${url}" />`,
    );
    out = out.replace(
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
        `<meta name="twitter:title" content="${title}" />`,
    );
    out = out.replace(
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
        `<meta name="twitter:description" content="${description}" />`,
    );
    return out;
}

const indexHtml = await readFile(path.join(distDir, "index.html"), "utf8");

for (const page of pages) {
    const dir = path.join(distDir, page.route);
    await mkdir(dir, { recursive: true });
    const html = replaceMeta(indexHtml, page);
    await writeFile(path.join(dir, "index.html"), html, "utf8");
    console.log(`[seo] wrote dist/${page.route}/index.html`);
}
