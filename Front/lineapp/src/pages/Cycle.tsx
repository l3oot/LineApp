import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import "../styles/Cycle.css";
import { FaPlus } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import Addcycle from "../components/Addcycle";
import { useTranslation } from "react-i18next";
import { icons } from "../assets/Iconlist";
import dayjs, { type Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ApiError } from "../lib/api";
import { auth } from "../lib/auth";
import { cycleApi, type Cycle } from "../lib/userService";

type IconName = keyof typeof icons;

function isIconName(value: string | null | undefined): value is IconName {
    return Boolean(value && Object.prototype.hasOwnProperty.call(icons, value));
}

function formatMonth(value: Dayjs | null): string {
    if (!value) return "";
    return value
        .toDate()
        .toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function cycleLengthLabel(c: Cycle): string {
    const start = c.startDate ? dayjs(c.startDate) : null;
    const end = c.endDate ? dayjs(c.endDate) : null;
    return `${formatMonth(start)} - ${formatMonth(end)}`;
}

const datePickerTextFieldSx = {
    mt: 1.5,
    "& .MuiPickersOutlinedInput-root": {
        borderRadius: "var(--radius-control)",
        backgroundColor: "var(--surface)",
        color: "var(--text)",
        "& fieldset": { borderColor: "var(--border)" },
        "&:hover fieldset": { borderColor: "var(--border)" },
        "&.Mui-focused fieldset": { borderColor: "var(--primary)" },
    },
    "& .MuiPickersSectionList-root": { fontSize: "0.875rem" },
    "& .MuiInputAdornment-root .MuiSvgIcon-root": { color: "var(--text-soft)" },
};

export default function CyclePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [farmType, setFarmType] = useState("");
    const [selectedIcon, setSelectedIcon] = useState<IconName>("corn");
    const [iconQuery, setIconQuery] = useState("");
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [startDate, setStartDate] = useState<Dayjs | null>(null);
    const [endDate, setEndDate] = useState<Dayjs | null>(null);
    const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
    const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);
    const startPickerRef = useRef<HTMLLabelElement>(null);
    const endPickerRef = useRef<HTMLLabelElement>(null);

    const iconOptions = Object.entries(icons) as [IconName, string][];
    const filteredIcons = iconOptions.filter(([key]) =>
        key.toLowerCase().includes(iconQuery.trim().toLowerCase()),
    );

    useEffect(() => {
        if (!auth.isAuthed()) {
            navigate("/settings", { replace: true });
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        cycleApi
            .list()
            .then((data) => {
                if (!cancelled) setCycles(data ?? []);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setError(err instanceof ApiError ? err.message : (err as Error).message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [navigate]);

    const resetForm = () => {
        setTitle("");
        setFarmType("");
        setSelectedIcon("corn");
        setIconQuery("");
        setIsIconPickerOpen(false);
        setStartDate(null);
        setEndDate(null);
        setIsStartPickerOpen(false);
        setIsEndPickerOpen(false);
    };

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
        setIsStartPickerOpen(false);
        setIsEndPickerOpen(false);
    };

    const handleFormPointerDownCapture = (event: PointerEvent<HTMLFormElement>) => {
        const target = event.target as HTMLElement;
        const insideStart = startPickerRef.current?.contains(target) ?? false;
        const insideEnd = endPickerRef.current?.contains(target) ?? false;
        const insidePopper = Boolean(target.closest(".MuiPickerPopper-root"));
        if (!insideStart && !insidePopper) setIsStartPickerOpen(false);
        if (!insideEnd && !insidePopper) setIsEndPickerOpen(false);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextTitle = title.trim();
        if (!nextTitle || !startDate || !endDate) return;

        setSubmitting(true);
        setError(null);
        try {
            const created = await cycleApi.create({
                name: nextTitle,
                farmType: farmType.trim() || "ทั่วไป",
                startDate: startDate.format("YYYY-MM-DD"),
                endDate: endDate.format("YYYY-MM-DD"),
                status: "active",
                icon: selectedIcon,
            });
            setCycles((prev) => [created, ...prev]);
            resetForm();
            handleCloseSheet();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : (err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MainLayout>
            <div className="flex flex-col gap-4 px-5 pb-3">
                <button
                    type="button"
                    onClick={() => setIsSheetOpen(true)}
                    className="addbutton group transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                >
                    <FaPlus size={14} color="var(--primary)" className="group-hover:rotate-90 transition-transform" />
                    <p className="ml-2 font-bold text-[var(--primary)]">{t("cycle.addNew")}</p>
                </button>

                {error && (
                    <p className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                        {error}
                    </p>
                )}

                {loading && (
                    <p className="text-center text-sm text-[var(--text-soft)]">กำลังโหลด...</p>
                )}

                <div className="flex flex-col gap-3">
                    {cycles.map((cycle) => (
                        <Addcycle
                            key={cycle.cycleId}
                            title={cycle.name}
                            balance={0}
                            balanceused={0}
                            length={cycleLengthLabel(cycle)}
                            icon={isIconName(cycle.icon) ? cycle.icon : "corn"}
                        />
                    ))}
                    {!loading && cycles.length === 0 && !error && (
                        <p className="text-center text-sm text-[var(--text-soft)]">
                            ยังไม่มีรอบปลูก กดปุ่ม + เพื่อเริ่มต้น
                        </p>
                    )}
                </div>
            </div>

            {isSheetOpen && (
                <div className="bottom-sheet-backdrop fixed inset-0 z-50 bg-black/35" onClick={handleCloseSheet}>
                    <div
                        className="bottom-sheet-panel mx-auto flex h-[62vh] w-full max-w-[420px] flex-col rounded-t-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-base font-bold text-[var(--text)]">{t("cycle.formTitle")}</p>
                            <button
                                type="button"
                                aria-label={t("common.close")}
                                onClick={handleCloseSheet}
                                className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <form
                            className="flex flex-1 flex-col gap-3 overflow-y-auto pb-1"
                            onSubmit={handleSubmit}
                            onPointerDownCapture={handleFormPointerDownCapture}
                        >
                            <div className="flex items-end gap-2">
                                <label className="flex-1 text-sm font-semibold text-[var(--text)]">
                                    {t("cycle.nameLabel")}
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        placeholder={t("cycle.namePlaceholder")}
                                        className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                                    />
                                </label>
                                <button
                                    type="button"
                                    aria-label={t("cycle.iconLabel")}
                                    title={`${t("cycle.iconLabel")} (${selectedIcon})`}
                                    onClick={() => setIsIconPickerOpen((prev) => !prev)}
                                    className="mt-1.5 flex h-[38px] w-[46px] items-center justify-center gap-0.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] transition-all hover:border-[var(--primary)]"
                                >
                                    <span className="text-[20px] leading-none">{icons[selectedIcon]}</span>
                                </button>
                            </div>

                            <label className="text-sm font-semibold text-[var(--text)]">
                                ประเภท (farmType)
                                <input
                                    type="text"
                                    value={farmType}
                                    onChange={(event) => setFarmType(event.target.value)}
                                    placeholder="เช่น พืชไร่ / ประมง / ปศุสัตว์"
                                    className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                                />
                            </label>

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <div className="grid grid-cols-2 gap-2">
                                    <label ref={startPickerRef} className="text-sm font-semibold text-[var(--text)]">
                                        {t("cycle.startLabel")}
                                        <DatePicker
                                            value={startDate}
                                            onChange={setStartDate}
                                            open={isStartPickerOpen}
                                            onOpen={() => { setIsStartPickerOpen(true); setIsEndPickerOpen(false); }}
                                            onClose={() => setIsStartPickerOpen(false)}
                                            format="DD/MM/YYYY"
                                            slotProps={{
                                                textField: {
                                                    required: true,
                                                    fullWidth: true,
                                                    size: "small",
                                                    sx: datePickerTextFieldSx,
                                                    onClick: () => { setIsStartPickerOpen(true); setIsEndPickerOpen(false); },
                                                },
                                            }}
                                        />
                                    </label>
                                    <label ref={endPickerRef} className="text-sm font-semibold text-[var(--text)]">
                                        {t("cycle.endLabel")}
                                        <DatePicker
                                            value={endDate}
                                            onChange={setEndDate}
                                            open={isEndPickerOpen}
                                            onOpen={() => { setIsEndPickerOpen(true); setIsStartPickerOpen(false); }}
                                            onClose={() => setIsEndPickerOpen(false)}
                                            format="DD/MM/YYYY"
                                            slotProps={{
                                                textField: {
                                                    required: true,
                                                    fullWidth: true,
                                                    size: "small",
                                                    sx: datePickerTextFieldSx,
                                                    onClick: () => { setIsEndPickerOpen(true); setIsStartPickerOpen(false); },
                                                },
                                            }}
                                        />
                                    </label>
                                </div>
                            </LocalizationProvider>

                            <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseSheet}
                                    disabled={submitting}
                                    className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)] disabled:opacity-50"
                                >
                                    {t("cycle.cancel")}
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--primary)] transition-all hover:brightness-95 disabled:opacity-50"
                                >
                                    {submitting ? "กำลังบันทึก..." : t("cycle.save")}
                                </button>
                            </div>
                        </form>

                        {isIconPickerOpen && (
                            <div
                                className="fixed inset-0 z-[60] bg-black/20 px-4"
                                onClick={() => setIsIconPickerOpen(false)}
                            >
                                <div
                                    className="mx-auto mt-[24vh] w-full max-w-[400px] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-soft)]"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-sm font-bold text-[var(--text)]">{t("cycle.iconLabel")}</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsIconPickerOpen(false)}
                                            className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)]"
                                        >
                                            <FiX size={16} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={iconQuery}
                                        onChange={(event) => setIconQuery(event.target.value)}
                                        placeholder={t("cycle.iconSearchPlaceholder")}
                                        className="w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)] outline-none transition-all focus:border-[var(--primary)]"
                                    />
                                    <div className="mt-2 grid max-h-[220px] grid-cols-8 gap-1.5 overflow-y-auto pr-1">
                                        {filteredIcons.map(([key, emoji]) => {
                                            const isSelected = selectedIcon === key;
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    aria-label={key}
                                                    title={key}
                                                    onClick={() => {
                                                        setSelectedIcon(key);
                                                        setIsIconPickerOpen(false);
                                                    }}
                                                    className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[22px] transition-all ${
                                                        isSelected
                                                            ? "bg-[var(--primary-soft)] ring-1 ring-[var(--primary)]"
                                                            : "bg-[var(--surface-soft)] hover:bg-[var(--surface)]"
                                                    }`}
                                                >
                                                    {emoji}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
