import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import BottomSheet from "./BottomSheet";
import { ApiError, getApiErrorMessage } from "../lib/api";
import {
    thaiAdminApi,
    userProfileApi,
    type ThaiAdminOption,
    type UserProfile,
} from "../lib/userService";

type UserProfileBottomSheetProps = {
    open: boolean;
    profile: UserProfile | null;
    onClose: () => void;
    onSaved: (profile: UserProfile) => void;
};

type PickerKey = "province" | "district" | "subdistrict";

type ScrollPickerFieldProps = {
    label: string;
    pickerKey: PickerKey;
    activePicker: PickerKey | null;
    onToggle: (key: PickerKey) => void;
    disabled?: boolean;
    placeholder: string;
    selectedName: string | null;
    options: ThaiAdminOption[];
    selectedCode: string;
    onSelect: (code: string) => void;
};

function ScrollPickerField({
    label,
    pickerKey,
    activePicker,
    onToggle,
    disabled = false,
    placeholder,
    selectedName,
    options,
    selectedCode,
    onSelect,
}: ScrollPickerFieldProps) {
    const isOpen = activePicker === pickerKey;

    return (
        <label className="text-sm font-bold text-[var(--text)]">
            {label}
            <button
                type="button"
                disabled={disabled}
                onClick={() => onToggle(pickerKey)}
                className="mt-2 flex w-full items-center justify-between rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm transition-all hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
                <span className={selectedName ? "text-[var(--text)]" : "text-[var(--text-soft)]"}>
                    {selectedName ?? placeholder}
                </span>
                <FiChevronDown
                    size={18}
                    className={`text-[var(--text-soft)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>
            {isOpen && !disabled && (
                <div className="mt-2 max-h-[180px] overflow-y-auto rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)]">
                    <button
                        type="button"
                        onClick={() => onSelect("")}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all ${
                            !selectedCode
                                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                : "text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                        }`}
                    >
                        <span>{placeholder}</span>
                        {!selectedCode && <FiCheck size={18} className="text-[var(--text-soft)]" />}
                    </button>
                    {options.map((item) => {
                        const isSelected = selectedCode === item.code;
                        return (
                            <button
                                key={item.code}
                                type="button"
                                onClick={() => onSelect(item.code)}
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all ${
                                    isSelected
                                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                        : "text-[var(--text)] hover:bg-[var(--surface-soft)]"
                                }`}
                            >
                                <span>{item.name}</span>
                                {isSelected && <FiCheck size={18} className="text-[var(--text-soft)]" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </label>
    );
}

export default function UserProfileBottomSheet({
    open,
    profile,
    onClose,
    onSaved,
}: UserProfileBottomSheetProps) {
    const { t } = useTranslation();
    const [provinces, setProvinces] = useState<ThaiAdminOption[]>([]);
    const [districts, setDistricts] = useState<ThaiAdminOption[]>([]);
    const [subdistricts, setSubdistricts] = useState<ThaiAdminOption[]>([]);
    const [provinceCode, setProvinceCode] = useState("");
    const [districtCode, setDistrictCode] = useState("");
    const [subDistrictCode, setSubDistrictCode] = useState("");
    const [mainAgricultureType, setMainAgricultureType] = useState("");
    const [adminLoading, setAdminLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [adminError, setAdminError] = useState<string | null>(null);
    const [activePicker, setActivePicker] = useState<PickerKey | null>(null);
    const skipProfileInitRef = useRef(false);

    const loadDistricts = useCallback(async (nextProvinceCode: string) => {
        const list = await thaiAdminApi.listDistricts(nextProvinceCode);
        setDistricts(list);
        return list;
    }, []);

    const loadSubdistricts = useCallback(async (nextDistrictCode: string) => {
        const list = await thaiAdminApi.listSubdistricts(nextDistrictCode);
        setSubdistricts(list);
        return list;
    }, []);

    useEffect(() => {
        if (!open) {
            setActivePicker(null);
            return;
        }
        if (skipProfileInitRef.current) {
            return;
        }

        setMainAgricultureType(profile?.mainAgricultureType ?? "");
        setError(null);
        setAdminError(null);

        let cancelled = false;
        (async () => {
            setAdminLoading(true);
            setProvinceCode("");
            setDistrictCode("");
            setSubDistrictCode("");
            setDistricts([]);
            setSubdistricts([]);

            try {
                const provinceList = await thaiAdminApi.listProvinces();
                if (cancelled) return;
                setProvinces(provinceList);

                const matchedProvince = provinceList.find((item) => item.name === profile?.province);
                const nextProvinceCode = matchedProvince?.code ?? "";
                setProvinceCode(nextProvinceCode);

                if (!nextProvinceCode) {
                    return;
                }

                const districtList = await loadDistricts(nextProvinceCode);
                if (cancelled) return;

                const matchedDistrict = districtList.find((item) => item.name === profile?.district);
                const nextDistrictCode = matchedDistrict?.code ?? "";
                setDistrictCode(nextDistrictCode);

                if (!nextDistrictCode) {
                    return;
                }

                const subdistrictList = await loadSubdistricts(nextDistrictCode);
                if (cancelled) return;

                const matchedSubdistrict = subdistrictList.find((item) => item.name === profile?.subDistrict);
                setSubDistrictCode(matchedSubdistrict?.code ?? "");
            } catch (err) {
                if (cancelled) return;
                setAdminError(getApiErrorMessage(err, t));
            } finally {
                if (!cancelled) {
                    setAdminLoading(false);
                    skipProfileInitRef.current = true;
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, profile, loadDistricts, loadSubdistricts]);

    const togglePicker = (key: PickerKey) => {
        setActivePicker((current) => (current === key ? null : key));
    };

    const handleProvinceSelect = async (nextProvinceCode: string) => {
        setActivePicker(null);
        setProvinceCode(nextProvinceCode);
        setDistrictCode("");
        setSubDistrictCode("");
        setDistricts([]);
        setSubdistricts([]);
        if (!nextProvinceCode) return;

        setAdminLoading(true);
        setAdminError(null);
        try {
            await loadDistricts(nextProvinceCode);
        } catch (err) {
            setAdminError(getApiErrorMessage(err, t));
        } finally {
            setAdminLoading(false);
        }
    };

    const handleDistrictSelect = async (nextDistrictCode: string) => {
        setActivePicker(null);
        setDistrictCode(nextDistrictCode);
        setSubDistrictCode("");
        setSubdistricts([]);
        if (!nextDistrictCode) return;

        setAdminLoading(true);
        setAdminError(null);
        try {
            await loadSubdistricts(nextDistrictCode);
        } catch (err) {
            setAdminError(getApiErrorMessage(err, t));
        } finally {
            setAdminLoading(false);
        }
    };

    const handleSubdistrictSelect = (nextSubDistrictCode: string) => {
        setActivePicker(null);
        setSubDistrictCode(nextSubDistrictCode);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const saved = await userProfileApi.upsert({
                province: provinces.find((item) => item.code === provinceCode)?.name ?? null,
                district: districts.find((item) => item.code === districtCode)?.name ?? null,
                subDistrict: subdistricts.find((item) => item.code === subDistrictCode)?.name ?? null,
                mainAgricultureType: mainAgricultureType.trim() || null,
            });
            skipProfileInitRef.current = false;
            onSaved(saved);
            onClose();
        } catch (err) {
            setError(getApiErrorMessage(err, t));
        } finally {
            setSubmitting(false);
        }
    };

    const selectedProvinceName = provinces.find((item) => item.code === provinceCode)?.name ?? null;
    const selectedDistrictName = districts.find((item) => item.code === districtCode)?.name ?? null;
    const selectedSubdistrictName = subdistricts.find((item) => item.code === subDistrictCode)?.name ?? null;

    const provincePlaceholder =
        adminLoading && provinces.length === 0
            ? t("settings.profileSheet.loadingOptions")
            : t("settings.profileSheet.selectPlaceholder");
    const districtPlaceholder = !provinceCode
        ? t("settings.profileSheet.selectProvinceFirst")
        : adminLoading && districts.length === 0
          ? t("settings.profileSheet.loadingOptions")
          : t("settings.profileSheet.selectPlaceholder");
    const subdistrictPlaceholder = !districtCode
        ? t("settings.profileSheet.selectDistrictFirst")
        : adminLoading && subdistricts.length === 0
          ? t("settings.profileSheet.loadingOptions")
          : t("settings.profileSheet.selectPlaceholder");

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            dragDisabled={submitting}
            panelClassName="mx-auto flex max-h-[78vh] w-full max-w-[420px] flex-col rounded-t-[22px] border border-[var(--border)] p-4 shadow-[var(--shadow-soft)]"
        >
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text)]">{t("settings.profileSheet.title")}</h3>
                <button
                    type="button"
                    aria-label={t("common.close")}
                    disabled={submitting}
                    onClick={onClose}
                    className="rounded-full p-1 text-[var(--text-soft)] transition-all hover:bg-[var(--surface-soft)] disabled:opacity-50"
                >
                    <FiX size={20} />
                </button>
            </div>

            <form className="bottom-sheet-scroll flex flex-1 flex-col gap-4 overflow-y-auto pb-1" onSubmit={handleSubmit}>
                <ScrollPickerField
                    label={t("settings.profileSheet.provinceLabel")}
                    pickerKey="province"
                    activePicker={activePicker}
                    onToggle={togglePicker}
                    disabled={submitting || (adminLoading && provinces.length === 0)}
                    placeholder={provincePlaceholder}
                    selectedName={selectedProvinceName}
                    options={provinces}
                    selectedCode={provinceCode}
                    onSelect={(code) => void handleProvinceSelect(code)}
                />

                <ScrollPickerField
                    label={t("settings.profileSheet.districtLabel")}
                    pickerKey="district"
                    activePicker={activePicker}
                    onToggle={togglePicker}
                    disabled={submitting || !provinceCode || (adminLoading && districts.length === 0)}
                    placeholder={districtPlaceholder}
                    selectedName={selectedDistrictName}
                    options={districts}
                    selectedCode={districtCode}
                    onSelect={(code) => void handleDistrictSelect(code)}
                />

                <ScrollPickerField
                    label={t("settings.profileSheet.subDistrictLabel")}
                    pickerKey="subdistrict"
                    activePicker={activePicker}
                    onToggle={togglePicker}
                    disabled={submitting || !districtCode || (adminLoading && subdistricts.length === 0)}
                    placeholder={subdistrictPlaceholder}
                    selectedName={selectedSubdistrictName}
                    options={subdistricts}
                    selectedCode={subDistrictCode}
                    onSelect={handleSubdistrictSelect}
                />

                <label className="text-sm font-bold text-[var(--text)]">
                    {t("settings.profileSheet.mainAgricultureLabel")}
                    <input
                        type="text"
                        value={mainAgricultureType}
                        onChange={(event) => setMainAgricultureType(event.target.value)}
                        placeholder={t("settings.profileSheet.mainAgriculturePlaceholder")}
                        disabled={submitting}
                        className="mt-2 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--primary)] disabled:opacity-60"
                    />
                </label>

                {adminError && <p className="text-sm text-[var(--danger)]">{adminError}</p>}
                {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

                <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={onClose}
                        className="pill-action-btn pill-action-btn--compact pill-action-btn--cancel"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || adminLoading}
                        className="pill-action-btn pill-action-btn--compact"
                    >
                        <span className="pill-action-btn-text">
                            {submitting ? t("settings.profileSheet.saving") : t("settings.profileSheet.save")}
                        </span>
                    </button>
                </div>
            </form>
        </BottomSheet>
    );
}
