import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FiX } from "react-icons/fi";
import { FaPlus } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { ApiError, getApiErrorMessage } from "../lib/api";
import { auth } from "../lib/auth";
import { categoryApi, type Category } from "../lib/userService";

type CategoryCenterModalProps = {
    open: boolean;
    onClose: () => void;
};

export default function CategoryCenterModal({ open, onClose }: CategoryCenterModalProps) {
    const { t } = useTranslation();
    const [activeType, setActiveType] = useState<"income" | "expense">("income");
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [saving, setSaving] = useState(false);

    const isIncomeType = activeType === "income";

    const loadCategories = useCallback(async () => {
        if (!auth.isAuthed()) {
            setCategories([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await categoryApi.list(activeType);
            setCategories(data ?? []);
        } catch (err) {
            setCategories([]);
            setError(getApiErrorMessage(err, t));
        } finally {
            setLoading(false);
        }
    }, [activeType]);

    useEffect(() => {
        if (!open) return;
        setIsAdding(false);
        setNewName("");
        setEditingId(null);
        setEditName("");
        loadCategories();
    }, [open, loadCategories]);

    const resetEditor = () => {
        setIsAdding(false);
        setNewName("");
        setEditingId(null);
        setEditName("");
    };

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = newName.trim();
        if (!name) return;

        setSaving(true);
        setError(null);
        try {
            await categoryApi.create({ name, type: activeType });
            resetEditor();
            await loadCategories();
        } catch (err) {
            setError(getApiErrorMessage(err, t));
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (categoryId: string) => {
        const name = editName.trim();
        if (!name) return;

        setSaving(true);
        setError(null);
        try {
            await categoryApi.update({ categoryId, name, type: activeType });
            resetEditor();
            await loadCategories();
        } catch (err) {
            setError(getApiErrorMessage(err, t));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category: Category) => {
        if (!window.confirm(`ลบหมวด "${category.name}" ?`)) return;

        setSaving(true);
        setError(null);
        try {
            await categoryApi.delete(category.categoryId);
            if (editingId === category.categoryId) {
                resetEditor();
            }
            await loadCategories();
        } catch (err) {
            setError(getApiErrorMessage(err, t));
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/35 px-4" onClick={onClose}>
            <div
                className="mx-auto mt-[22vh] w-full max-w-[420px] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-base font-bold text-[var(--text)]">{t("settings.categorySheet.title")}</p>
                    <button
                        type="button"
                        aria-label={t("common.close")}
                        onClick={onClose}
                        className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                            setActiveType("income");
                            resetEditor();
                        }}
                        className={
                            activeType === "income"
                                ? "pill-action-btn pill-action-btn--compact"
                                : "pill-type-btn--idle pill-type-btn--income-idle"
                        }
                    >
                        <span className={activeType === "income" ? "pill-action-btn-text" : undefined}>
                            {t("settings.categorySheet.income")}
                        </span>
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                            setActiveType("expense");
                            resetEditor();
                        }}
                        className={
                            activeType === "expense"
                                ? "pill-action-btn pill-action-btn--compact pill-action-btn--expense"
                                : "pill-type-btn--idle pill-type-btn--expense-idle"
                        }
                    >
                        <span className={activeType === "expense" ? "pill-action-btn-text" : undefined}>
                            {t("settings.categorySheet.expense")}
                        </span>
                    </button>
                </div>

                {!isAdding ? (
                    <button
                        type="button"
                        disabled={saving || editingId !== null}
                        onClick={() => setIsAdding(true)}
                        className={`group mt-2 flex w-full items-center justify-center rounded-[var(--radius-control)] border-2 border-dashed px-3 py-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 ${
                            isIncomeType
                                ? "border-[var(--primary)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                                : "border-red-200 bg-[var(--surface)] hover:border-[var(--danger)] hover:bg-red-50"
                        }`}
                    >
                        <FaPlus
                            size={12}
                            className={`transition-transform group-hover:rotate-90 ${
                                isIncomeType ? "text-[var(--primary)]" : "text-[var(--danger)]"
                            }`}
                        />
                        <p className={`ml-2 font-bold ${isIncomeType ? "text-[var(--primary)]" : "text-[var(--danger)]"}`}>
                            {activeType === "income"
                                ? t("settings.categorySheet.addIncome")
                                : t("settings.categorySheet.addExpense")}
                        </p>
                    </button>
                ) : (
                    <form onSubmit={handleCreate} className="mt-2 flex gap-2">
                        <input
                            type="text"
                            autoFocus
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder={t("settings.categorySheet.category")}
                            className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                        />
                        <button
                            type="submit"
                            disabled={saving || !newName.trim()}
                            className="rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-2 text-xs font-semibold text-[var(--primary)] disabled:opacity-50"
                        >
                            {t("cycle.save")}
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={resetEditor}
                            className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-soft)]"
                        >
                            {t("cycle.cancel")}
                        </button>
                    </form>
                )}

                {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}

                <div className="mt-2 max-h-[240px] overflow-y-auto">
                    {loading ? (
                        <p className="px-2.5 py-3 text-sm text-[var(--text-soft)]">กำลังโหลด...</p>
                    ) : categories.length === 0 ? (
                        <p className="px-2.5 py-3 text-sm text-[var(--text-soft)]">{t("list.empty")}</p>
                    ) : (
                        <ul className="m-0 list-none space-y-2 p-0 text-sm">
                            {categories.map((item) => {
                                const isEditing = editingId === item.categoryId;
                                return (
                                    <li
                                        key={item.categoryId}
                                        className={`flex w-full items-center justify-between gap-2 overflow-hidden rounded-[var(--radius-control)] border bg-[var(--surface)] px-3 py-2 text-[var(--text)] shadow-[var(--shadow-soft)] ${
                                            isIncomeType
                                                ? "border-[var(--primary)]/40"
                                                : "border-[var(--danger)]/35"
                                        }`}
                                    >
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                autoFocus
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border)] px-2 py-1 text-sm outline-none focus:border-[var(--primary)]"
                                            />
                                        ) : (
                                            <span className="min-w-0 truncate text-[14px] font-medium text-[var(--text)] md:text-[15px]">
                                                {item.name}
                                            </span>
                                        )}
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={saving || !editName.trim()}
                                                        onClick={() => handleUpdate(item.categoryId)}
                                                        className="rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)] disabled:opacity-50"
                                                    >
                                                        {t("cycle.save")}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={resetEditor}
                                                        className="rounded-[var(--radius-control)] border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-soft)]"
                                                    >
                                                        {t("cycle.cancel")}
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={saving || isAdding}
                                                        onClick={() => {
                                                            setIsAdding(false);
                                                            setEditingId(item.categoryId);
                                                            setEditName(item.name);
                                                        }}
                                                        className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)] disabled:opacity-50"
                                                    >
                                                        {t("addcycle.edit")}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={() => handleDelete(item)}
                                                        className="rounded-[var(--radius-control)] border border-red-100 px-2.5 py-1 text-xs font-semibold text-[var(--danger)] transition-all hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        {t("addcycle.delete")}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
