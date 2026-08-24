import type { TFunction } from "i18next";
import type { Transaction } from "../lib/userService";
import { formatAppDateTime } from "./formatAppDate";

export type ExportRow = {
    date: string;
    type: string;
    category: string;
    note: string;
    amount: number;
};

function categoryNameForTx(
    tx: Transaction,
    categoryById: Record<string, string>,
    fallbackCategory: string,
): string {
    return tx.categoryId ? (categoryById[tx.categoryId] ?? fallbackCategory) : fallbackCategory;
}

export function buildExportRows(
    transactions: Transaction[],
    categoryById: Record<string, string>,
    fallbackCategory: string,
    lang: string,
    t: TFunction,
): ExportRow[] {
    const sorted = [...transactions].sort(
        (a, b) => new Date(b.txDate).getTime() - new Date(a.txDate).getTime(),
    );
    return sorted.map((tx) => ({
        date: formatAppDateTime(tx.txDate, lang),
        type: tx.txType === "income" ? t("transaction.income") : t("transaction.expense"),
        category: categoryNameForTx(tx, categoryById, fallbackCategory),
        note: tx.note?.trim() || "-",
        amount: tx.txType === "income" ? Number(tx.amount) : -Number(tx.amount),
    }));
}

function exportFileName(prefix: string, extension: string): string {
    const now = new Date();
    const stamp = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
        .map((part) => String(part).padStart(2, "0"))
        .join("-");
    return `${prefix}_${stamp}.${extension}`;
}

export async function exportTransactionsToExcel(
    rows: ExportRow[],
    fileNamePrefix: string,
    columns: { date: string; type: string; category: string; note: string; amount: string },
): Promise<void> {
    const XLSX = await import("xlsx");
    const sheetData = rows.map((row) => ({
        [columns.date]: row.date,
        [columns.type]: row.type,
        [columns.category]: row.category,
        [columns.note]: row.note,
        [columns.amount]: row.amount,
    }));
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    worksheet["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 28 }, { wch: 14 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, exportFileName(fileNamePrefix, "xlsx"));
}

export async function exportTransactionsToPdf(
    rows: ExportRow[],
    fileNamePrefix: string,
    title: string,
    columns: { date: string; type: string; category: string; note: string; amount: string },
): Promise<void> {
    const [{ jsPDF }, autoTableModule, { SARABUN_REGULAR_BASE64, SARABUN_BOLD_BASE64 }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        import("../assets/fonts/sarabunFont"),
    ]);
    const autoTable = autoTableModule.default;

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    doc.addFileToVFS("Sarabun-Regular.ttf", SARABUN_REGULAR_BASE64);
    doc.addFileToVFS("Sarabun-Bold.ttf", SARABUN_BOLD_BASE64);
    doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
    doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");
    doc.setFont("Sarabun", "normal");

    doc.setFontSize(14);
    doc.text(title, 40, 40);

    autoTable(doc, {
        startY: 60,
        head: [[columns.date, columns.type, columns.category, columns.note, columns.amount]],
        body: rows.map((row) => [
            row.date,
            row.type,
            row.category,
            row.note,
            row.amount.toLocaleString(),
        ]),
        styles: { font: "Sarabun", fontSize: 9, cellPadding: 5 },
        headStyles: { font: "Sarabun", fontStyle: "bold", fillColor: [16, 150, 90] },
        columnStyles: { 4: { halign: "right" } },
    });

    doc.save(exportFileName(fileNamePrefix, "pdf"));
}
