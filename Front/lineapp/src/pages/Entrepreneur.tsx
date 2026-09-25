import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import { LuImagePlus, LuStore } from "react-icons/lu";
import MainLayout from "../layouts/MainLayout";
import ConfirmBottomSheet from "../components/ConfirmBottomSheet";
import { auth } from "../lib/auth";
import {
    entrepreneurProductApi,
    productTypeApi,
    type EntrepreneurProduct,
    type ProductType,
} from "../lib/userService";
import { ApiError } from "../lib/api";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";
import "../styles/Entrepreneur.css";

const MAX_IMAGES = 3;

type KeptImage = {
    path: string;
    url: string;
};

type FormState = {
    productTypeId: string;
    name: string;
    properties: string;
    price: string;
    address: string;
    phone: string;
    tiktok: string;
    facebook: string;
    lineId: string;
    images: File[];
    keptImages: KeptImage[];
};

const EMPTY_FORM: FormState = {
    productTypeId: "",
    name: "",
    properties: "",
    price: "",
    address: "",
    phone: "",
    tiktok: "",
    facebook: "",
    lineId: "",
    images: [],
    keptImages: [],
};

const SOCIAL_LOGOS = {
    tiktok: "https://static.vecteezy.com/system/resources/previews/016/716/450/non_2x/tiktok-icon-free-png.png",
    facebook:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Facebook_f_logo_%282019%29.svg/250px-Facebook_f_logo_%282019%29.svg.png",
    line: "https://upload.wikimedia.org/wikipedia/commons/2/2e/LINE_New_App_Icon_%282020-12%29.png",
} as const;

function formatPrice(value: number): string {
    return new Intl.NumberFormat("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

function toKeptImages(product: EntrepreneurProduct): KeptImage[] {
    const paths = product.imagePaths ?? [];
    const urls = product.imageUrls ?? [];
    if (paths.length === 0 && product.imageUrl) {
        return [{ path: "", url: product.imageUrl }];
    }
    return paths.map((path, index) => ({
        path,
        url: urls[index] ?? product.imageUrl ?? "",
    })).filter((item) => item.url);
}

export default function Entrepreneur() {
    const { t } = useTranslation();
    const formTopRef = useRef<HTMLElement | null>(null);
    const [productTypes, setProductTypes] = useState<ProductType[]>([]);
    const [products, setProducts] = useState<EntrepreneurProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [editingProduct, setEditingProduct] = useState<EntrepreneurProduct | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<EntrepreneurProduct | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const isEditing = Boolean(editingProduct);
    const totalImages = form.keptImages.length + form.images.length;
    const canAddMoreImages = totalImages < MAX_IMAGES;
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

    useEffect(() => {
        const urls = form.images.map((file) => URL.createObjectURL(file));
        setNewImagePreviews(urls);
        return () => {
            for (const url of urls) {
                URL.revokeObjectURL(url);
            }
        };
    }, [form.images]);

    const loadProducts = useCallback(async () => {
        if (!auth.isAuthed()) {
            setProducts([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await entrepreneurProductApi.listMine();
            setProducts(data ?? []);
        } catch (err) {
            setProducts([]);
            setError(getFriendlyApiErrorMessage(err, t));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const loadProductTypes = useCallback(async () => {
        try {
            const data = await productTypeApi.list();
            setProductTypes(data ?? []);
        } catch (err) {
            setProductTypes([]);
            setError(getFriendlyApiErrorMessage(err, t));
        }
    }, [t]);

    useEffect(() => {
        void loadProductTypes();
        void loadProducts();
    }, [loadProductTypes, loadProducts]);

    const resetForm = (keepTypeId = true) => {
        setEditingProduct(null);
        setForm((prev) => ({
            ...EMPTY_FORM,
            productTypeId: keepTypeId ? prev.productTypeId : "",
        }));
    };

    const startEdit = (product: EntrepreneurProduct) => {
        setError(null);
        setEditingProduct(product);
        setForm({
            productTypeId: product.productTypeId ?? "",
            name: product.name,
            properties: product.properties,
            price: String(product.price ?? ""),
            address: product.address ?? "",
            phone: product.phone ?? "",
            tiktok: product.tiktok ?? "",
            facebook: product.facebook ?? "",
            lineId: product.lineId ?? "",
            images: [],
            keptImages: toKeptImages(product),
        });
        formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const addImages = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        const picked = Array.from(fileList).filter((file) =>
            file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name),
        );
        if (picked.length === 0) return;

        setForm((prev) => {
            const remaining = MAX_IMAGES - (prev.keptImages.length + prev.images.length);
            if (remaining <= 0) return prev;
            return {
                ...prev,
                images: [...prev.images, ...picked].slice(0, prev.images.length + remaining),
            };
        });
    };

    const removeKeptImage = (path: string) => {
        setForm((prev) => ({
            ...prev,
            keptImages: prev.keptImages.filter((item) => item.path !== path),
        }));
    };

    const removeNewImage = (index: number) => {
        setForm((prev) => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!auth.isAuthed() || saving) return;
        if (totalImages === 0) return;

        setSaving(true);
        setError(null);
        try {
            const payload = {
                productTypeId: form.productTypeId,
                name: form.name,
                properties: form.properties,
                price: form.price,
                address: form.address,
                phone: form.phone,
                tiktok: form.tiktok,
                facebook: form.facebook,
                lineId: form.lineId,
                images: form.images,
                keepImagePaths: form.keptImages.map((item) => item.path).filter(Boolean),
            };
            if (editingProduct) {
                await entrepreneurProductApi.update(editingProduct.productId, payload);
            } else {
                await entrepreneurProductApi.create(payload);
            }
            resetForm();
            await loadProducts();
        } catch (err) {
            if (err instanceof ApiError && err.message) {
                setError(err.message);
            } else {
                setError(getFriendlyApiErrorMessage(err, t));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget || deleteBusy) return;
        setDeleteBusy(true);
        setError(null);
        try {
            await entrepreneurProductApi.delete(deleteTarget.productId);
            if (editingProduct?.productId === deleteTarget.productId) {
                resetForm();
            }
            setDeleteTarget(null);
            await loadProducts();
        } catch (err) {
            setError(getFriendlyApiErrorMessage(err, t));
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <MainLayout>
            <div className="home-page">
                <div className="home-content-card entrepreneur-page">
                    <section className="entrepreneur-section" ref={formTopRef}>
                        <h2 className="home-section-title">
                            <span className="home-section-decor home-section-decor--leaf" aria-hidden />
                            {isEditing
                                ? t("entrepreneur.editSectionTitle")
                                : t("entrepreneur.sectionTitle")}
                        </h2>
                        <p className="entrepreneur-subtitle">
                            {isEditing
                                ? t("entrepreneur.editSectionSubtitle")
                                : t("entrepreneur.sectionSubtitle")}
                        </p>

                        <form className="entrepreneur-form" onSubmit={handleSubmit}>
                            <div className="entrepreneur-form-main">
                                <div className="entrepreneur-image-panel">
                                    <div className="entrepreneur-image-grid">
                                        {form.keptImages.map((item) => (
                                            <div
                                                key={item.path || item.url}
                                                className="entrepreneur-image-thumb"
                                            >
                                                <img src={item.url} alt="" />
                                                <button
                                                    type="button"
                                                    className="entrepreneur-image-remove"
                                                    aria-label={t("entrepreneur.removeImage")}
                                                    onClick={() => removeKeptImage(item.path)}
                                                >
                                                    <FiX size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {form.images.map((_, index) => (
                                            <div
                                                key={`new-${index}-${form.images[index]?.name ?? index}`}
                                                className="entrepreneur-image-thumb"
                                            >
                                                <img
                                                    src={newImagePreviews[index]}
                                                    alt={t("entrepreneur.imagePreviewAlt")}
                                                />
                                                <button
                                                    type="button"
                                                    className="entrepreneur-image-remove"
                                                    aria-label={t("entrepreneur.removeImage")}
                                                    onClick={() => removeNewImage(index)}
                                                >
                                                    <FiX size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {canAddMoreImages && (
                                            <button
                                                type="button"
                                                className="entrepreneur-image-add"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <LuImagePlus size={20} aria-hidden />
                                                <span>{t("entrepreneur.imageLabel")}</span>
                                                <span className="entrepreneur-image-hint">
                                                    {t("entrepreneur.imageCountHint", {
                                                        count: totalImages,
                                                        max: MAX_IMAGES,
                                                    })}
                                                </span>
                                            </button>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                            className="sr-only"
                                            multiple
                                            onChange={(event) => {
                                                addImages(event.target.files);
                                                event.target.value = "";
                                            }}
                                        />
                                    </div>
                                    <p className="entrepreneur-image-panel-hint">
                                        {isEditing
                                            ? t("entrepreneur.imageHintEdit")
                                            : t("entrepreneur.imageHint")}
                                    </p>
                                </div>

                                <div className="entrepreneur-form-fields">
                                    <label className="entrepreneur-field">
                                        <span>{t("entrepreneur.nameLabel")}</span>
                                        <input
                                            type="text"
                                            value={form.name}
                                            maxLength={255}
                                            required
                                            placeholder={t("entrepreneur.namePlaceholder")}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    name: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>

                                    <label className="entrepreneur-field">
                                        <span>{t("entrepreneur.typeLabel")}</span>
                                        <select
                                            value={form.productTypeId}
                                            required
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    productTypeId: event.target.value,
                                                }))
                                            }
                                        >
                                            <option value="" disabled>
                                                {t("entrepreneur.typePlaceholder")}
                                            </option>
                                            {productTypes.map((type) => (
                                                <option
                                                    key={type.productTypeId}
                                                    value={type.productTypeId}
                                                >
                                                    {type.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="entrepreneur-field">
                                        <span>{t("entrepreneur.propertiesLabel")}</span>
                                        <textarea
                                            value={form.properties}
                                            required
                                            rows={3}
                                            maxLength={200}
                                            placeholder={t("entrepreneur.propertiesPlaceholder")}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    properties: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>

                                    <div className="entrepreneur-field-row">
                                        <label className="entrepreneur-field">
                                            <span>{t("entrepreneur.priceLabel")}</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step="0.01"
                                                value={form.price}
                                                required
                                                placeholder={t("entrepreneur.pricePlaceholder")}
                                                onChange={(event) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        price: event.target.value,
                                                    }))
                                                }
                                            />
                                        </label>

                                        <label className="entrepreneur-field">
                                            <span>{t("entrepreneur.phoneLabel")}</span>
                                            <input
                                                type="tel"
                                                value={form.phone}
                                                required
                                                maxLength={10}
                                                placeholder={t("entrepreneur.phonePlaceholder")}
                                                onChange={(event) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        phone: event.target.value,
                                                    }))
                                                }
                                            />
                                        </label>
                                    </div>

                                    <label className="entrepreneur-field">
                                        <span>{t("entrepreneur.addressLabel")}</span>
                                        <textarea
                                            value={form.address}
                                            required
                                            rows={2}
                                            maxLength={100}
                                            placeholder={t("entrepreneur.addressPlaceholder")}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    address: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>

                                    <fieldset className="entrepreneur-social">
                                        <legend>{t("entrepreneur.socialLabel")}</legend>
                                        <p className="entrepreneur-social-hint">
                                            {t("entrepreneur.socialHint")}
                                        </p>

                                        <div className="entrepreneur-social-grid">
                                            <label className="entrepreneur-social-field">
                                                <span className="entrepreneur-social-brand">
                                                    <img
                                                        src={SOCIAL_LOGOS.tiktok}
                                                        alt=""
                                                        aria-hidden
                                                    />
                                                    <span className="sr-only">TikTok</span>
                                                </span>
                                                <input
                                                    type="text"
                                                    value={form.tiktok}
                                                    placeholder={t("entrepreneur.tiktokPlaceholder")}
                                                    onChange={(event) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            tiktok: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>

                                            <label className="entrepreneur-social-field">
                                                <span className="entrepreneur-social-brand">
                                                    <img
                                                        src={SOCIAL_LOGOS.facebook}
                                                        alt=""
                                                        aria-hidden
                                                    />
                                                    <span className="sr-only">Facebook</span>
                                                </span>
                                                <input
                                                    type="text"
                                                    value={form.facebook}
                                                    placeholder={t(
                                                        "entrepreneur.facebookPlaceholder",
                                                    )}
                                                    onChange={(event) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            facebook: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>

                                            <label className="entrepreneur-social-field">
                                                <span className="entrepreneur-social-brand">
                                                    <img
                                                        src={SOCIAL_LOGOS.line}
                                                        alt=""
                                                        aria-hidden
                                                    />
                                                    <span className="sr-only">LINE</span>
                                                </span>
                                                <input
                                                    type="text"
                                                    value={form.lineId}
                                                    placeholder={t("entrepreneur.linePlaceholder")}
                                                    onChange={(event) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            lineId: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>
                                        </div>
                                    </fieldset>
                                </div>
                            </div>

                            {error && <p className="entrepreneur-error">{error}</p>}

                            <div className="entrepreneur-form-actions">
                                {isEditing && (
                                    <button
                                        type="button"
                                        className="entrepreneur-cancel"
                                        disabled={saving}
                                        onClick={() => resetForm()}
                                    >
                                        {t("entrepreneur.cancelEdit")}
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="entrepreneur-submit"
                                    disabled={
                                        saving ||
                                        !form.productTypeId ||
                                        totalImages === 0
                                    }
                                >
                                    {saving
                                        ? t("entrepreneur.saving")
                                        : isEditing
                                          ? t("entrepreneur.update")
                                          : t("entrepreneur.submit")}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="entrepreneur-section">
                        <h2 className="home-section-title">
                            <span className="home-section-decor home-section-decor--leaf" aria-hidden />
                            {t("entrepreneur.myProductsTitle")}
                        </h2>

                        {loading ? (
                            <p className="entrepreneur-empty">{t("entrepreneur.loading")}</p>
                        ) : products.length === 0 ? (
                            <div className="entrepreneur-empty-state">
                                <LuStore size={28} aria-hidden />
                                <p>{t("entrepreneur.empty")}</p>
                            </div>
                        ) : (
                            <ul className="entrepreneur-product-list">
                                {products.map((product) => (
                                    <li
                                        key={product.productId}
                                        className={`entrepreneur-product-card${
                                            editingProduct?.productId === product.productId
                                                ? " entrepreneur-product-card--editing"
                                                : ""
                                        }`}
                                    >
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="entrepreneur-product-image"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="entrepreneur-product-image entrepreneur-product-image--empty" />
                                        )}
                                        <div className="entrepreneur-product-body">
                                            {product.productTypeName && (
                                                <p className="entrepreneur-product-type">
                                                    {product.productTypeName}
                                                </p>
                                            )}
                                            <h3>{product.name}</h3>
                                            <p className="entrepreneur-product-properties">
                                                {product.properties}
                                            </p>
                                            <p className="entrepreneur-product-price">
                                                {t("entrepreneur.priceValue", {
                                                    price: formatPrice(Number(product.price)),
                                                })}
                                            </p>
                                            <p className="entrepreneur-product-contact">
                                                {t("entrepreneur.phoneValue", { phone: product.phone })}
                                            </p>
                                            <p className="entrepreneur-product-contact">
                                                {t("entrepreneur.addressValue", {
                                                    address: product.address,
                                                })}
                                            </p>
                                        </div>
                                        <div className="entrepreneur-product-actions">
                                            <button
                                                type="button"
                                                className="entrepreneur-edit"
                                                aria-label={t("entrepreneur.edit")}
                                                onClick={() => startEdit(product)}
                                            >
                                                <FiEdit2 size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                className="entrepreneur-delete"
                                                aria-label={t("entrepreneur.delete")}
                                                onClick={() => setDeleteTarget(product)}
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>

            <ConfirmBottomSheet
                open={Boolean(deleteTarget)}
                title={t("entrepreneur.deleteConfirmTitle")}
                message={t("entrepreneur.deleteConfirm")}
                confirmLabel={t("entrepreneur.delete")}
                busy={deleteBusy}
                danger
                onClose={() => {
                    if (!deleteBusy) setDeleteTarget(null);
                }}
                onConfirm={handleDelete}
            />
        </MainLayout>
    );
}
