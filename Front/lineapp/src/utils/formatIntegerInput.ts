/** ค่าตัวเลขดิบ (หลักเดียว) → แสดงด้วย comma คั่นหลัก */
export function formatIntegerWithCommas(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("en-US");
}

/** ค่าที่ผู้ใช้พิมพ์ → เก็บเฉพาะหลักตัวเลข */
export function parseIntegerInput(value: string): string {
    return value.replace(/\D/g, "");
}

export function parseIntegerInputNumber(raw: string): number {
    const digits = parseIntegerInput(raw);
    if (!digits) return Number.NaN;
    return Number(digits);
}
