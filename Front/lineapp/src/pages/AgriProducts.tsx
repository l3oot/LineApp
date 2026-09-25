import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiX } from "react-icons/fi";
import { LuPhone, LuSearch, LuStore } from "react-icons/lu";
import MainLayout from "../layouts/MainLayout";
import BottomSheet from "../components/BottomSheet";
import {
    entrepreneurProductApi,
    productTypeApi,
    type EntrepreneurProduct,
    type ProductType,
} from "../lib/userService";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";
import "../styles/Entrepreneur.css";

const ALL_TYPES = "";

function formatPrice(value: number): string {
    return new Intl.NumberFormat("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

export default function AgriProducts() {
    const { t } = useTranslation();
    const [products, setProducts] = useState<EntrepreneurProduct[]>([]);
    const [productTypes, setProductTypes] = useState<ProductType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
    const [selectedProduct, setSelectedProduct] = useState<EntrepreneurProduct | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [catalog, types] = await Promise.all([
                entrepreneurProductApi.listCatalog(),
                productTypeApi.list(),
            ]);
            setProducts(catalog ?? []);
            setProductTypes(types ?? []);
        } catch (err) {
            setProducts([]);
            setProductTypes([]);
            setError(getFriendlyApiErrorMessage(err, t));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadCatalog();
    }, [loadCatalog]);

    useEffect(() => {
        setSelectedImageIndex(0);
    }, [selectedProduct?.id]);

    const filteredProducts = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        return products.filter((product) => {
            if (typeFilter && product.productTypeId !== typeFilter) return false;
            if (!needle) return true;
            return product.name.toLowerCase().includes(needle);
        });
    }, [products, searchQuery, typeFilter]);

    const selectedImageUrls = useMemo(() => {
        if (!selectedProduct) return [];
        if (selectedProduct.imageUrls?.length) return selectedProduct.imageUrls;
        if (selectedProduct.imageUrl) return [selectedProduct.imageUrl];
        return [];
    }, [selectedProduct]);

    const activeImageUrl = selectedImageUrls[selectedImageIndex] ?? selectedImageUrls[0];

    return (
        <MainLayout>
            <div className="home-page">
                <div className="home-content-card entrepreneur-page">
                    <section className="entrepreneur-section">
                        <h2 className="home-section-title">
                            <span className="home-section-decor home-section-decor--leaf" aria-hidden />
                            {t("agriProducts.sectionTitle")}
                        </h2>
                        <p className="entrepreneur-subtitle">{t("agriProducts.sectionSubtitle")}</p>

                        <div className="agri-products-filters">
                            <label className="agri-products-search">
                                <span className="sr-only">{t("agriProducts.searchLabel")}</span>
                                <LuSearch size={18} aria-hidden className="agri-products-search-icon" />
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder={t("agriProducts.searchPlaceholder")}
                                    autoComplete="off"
                                />
                            </label>

                            <label className="agri-products-type-filter">
                                <span className="sr-only">{t("agriProducts.typeFilterLabel")}</span>
                                <select
                                    value={typeFilter}
                                    onChange={(event) => setTypeFilter(event.target.value)}
                                    aria-label={t("agriProducts.typeFilterLabel")}
                                >
                                    <option value={ALL_TYPES}>{t("agriProducts.typeFilterAll")}</option>
                                    {productTypes.map((type) => (
                                        <option key={type.productTypeId} value={type.productTypeId}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        {error && <p className="entrepreneur-error">{error}</p>}

                        {loading ? (
                            <p className="entrepreneur-empty">{t("agriProducts.loading")}</p>
                        ) : products.length === 0 ? (
                            <div className="entrepreneur-empty-state">
                                <LuStore size={28} aria-hidden />
                                <p>{t("agriProducts.empty")}</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="entrepreneur-empty-state">
                                <LuStore size={28} aria-hidden />
                                <p>{t("agriProducts.emptyFiltered")}</p>
                            </div>
                        ) : (
                            <ul className="entrepreneur-product-list entrepreneur-product-list--catalog">
                                {filteredProducts.map((product) => (
                                    <li key={product.productId}>
                                        <button
                                            type="button"
                                            className="entrepreneur-product-card entrepreneur-product-card--catalog"
                                            onClick={() => setSelectedProduct(product)}
                                        >
                                            <div className="entrepreneur-product-image-wrap">
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
                                            </div>
                                            <div className="entrepreneur-product-body">
                                                {product.productTypeName && (
                                                    <p className="entrepreneur-product-type">
                                                        {product.productTypeName}
                                                    </p>
                                                )}
                                                <h3>{product.name}</h3>
                                                <p className="entrepreneur-product-price">
                                                    {t("agriProducts.priceValue", {
                                                        price: formatPrice(Number(product.price)),
                                                    })}
                                                </p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>

            <BottomSheet
                open={Boolean(selectedProduct)}
                onClose={() => setSelectedProduct(null)}
                panelClassName="mx-auto flex max-h-[85vh] w-full max-w-[480px] flex-col rounded-t-[22px] p-0"
            >
                {selectedProduct && (
                    <div className="agri-product-detail">
                        <div className="agri-product-detail__header">
                            <h3 className="agri-product-detail__title">
                                {t("agriProducts.detailTitle")}
                            </h3>
                            <button
                                type="button"
                                aria-label={t("common.close")}
                                onClick={() => setSelectedProduct(null)}
                                className="agri-product-detail__close"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="bottom-sheet-scroll agri-product-detail__scroll">
                            <div className="agri-product-detail__gallery">
                                <div className="agri-product-detail__image-wrap">
                                    {activeImageUrl ? (
                                        <img
                                            src={activeImageUrl}
                                            alt={selectedProduct.name}
                                            className="agri-product-detail__image"
                                        />
                                    ) : (
                                        <div className="agri-product-detail__image agri-product-detail__image--empty" />
                                    )}
                                </div>
                                {selectedImageUrls.length > 1 && (
                                    <div className="agri-product-detail__thumbs" role="list">
                                        {selectedImageUrls.map((url, index) => (
                                            <button
                                                key={url}
                                                type="button"
                                                role="listitem"
                                                className={`agri-product-detail__thumb${
                                                    index === selectedImageIndex
                                                        ? " agri-product-detail__thumb--active"
                                                        : ""
                                                }`}
                                                aria-label={`${selectedProduct.name} ${index + 1}`}
                                                aria-pressed={index === selectedImageIndex}
                                                onClick={() => setSelectedImageIndex(index)}
                                            >
                                                <img src={url} alt="" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="agri-product-detail__body">
                                {selectedProduct.productTypeName && (
                                    <p className="entrepreneur-product-type">
                                        {selectedProduct.productTypeName}
                                    </p>
                                )}
                                <h4 className="agri-product-detail__name">{selectedProduct.name}</h4>
                                <p className="agri-product-detail__price">
                                    {t("agriProducts.priceValue", {
                                        price: formatPrice(Number(selectedProduct.price)),
                                    })}
                                </p>

                                <div className="agri-product-detail__block">
                                    <p className="agri-product-detail__label">
                                        {t("agriProducts.propertiesLabel")}
                                    </p>
                                    <p className="agri-product-detail__text">
                                        {selectedProduct.properties}
                                    </p>
                                </div>

                                <div className="agri-product-detail__block">
                                    <p className="agri-product-detail__label">
                                        {t("agriProducts.addressLabel")}
                                    </p>
                                    <p className="agri-product-detail__text">
                                        {selectedProduct.address}
                                    </p>
                                </div>

                                <div className="agri-product-detail__block">
                                    <p className="agri-product-detail__label">
                                        {t("agriProducts.phoneLabel")}
                                    </p>
                                    <a
                                        className="agri-product-detail__phone"
                                        href={`tel:${selectedProduct.phone}`}
                                    >
                                        <LuPhone size={16} aria-hidden />
                                        <span>{selectedProduct.phone}</span>
                                    </a>
                                </div>

                                {(selectedProduct.tiktok ||
                                    selectedProduct.facebook ||
                                    selectedProduct.lineId) && (
                                    <div className="agri-product-detail__block">
                                        <p className="agri-product-detail__label">
                                            {t("agriProducts.socialLabel")}
                                        </p>
                                        <div className="agri-product-detail__socials">
                                            {selectedProduct.tiktok && (
                                                <a
                                                    className="agri-product-detail__social"
                                                    href={selectedProduct.tiktok}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <img
                                                        src="https://static.vecteezy.com/system/resources/previews/016/716/450/non_2x/tiktok-icon-free-png.png"
                                                        alt="TikTok"
                                                    />
                                                    <span>TikTok</span>
                                                </a>
                                            )}
                                            {selectedProduct.facebook && (
                                                <a
                                                    className="agri-product-detail__social"
                                                    href={selectedProduct.facebook}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <img
                                                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Facebook_f_logo_%282019%29.svg/250px-Facebook_f_logo_%282019%29.svg.png"
                                                        alt="Facebook"
                                                    />
                                                    <span>Facebook</span>
                                                </a>
                                            )}
                                            {selectedProduct.lineId && (
                                                <a
                                                    className="agri-product-detail__social"
                                                    href={
                                                        selectedProduct.lineId.startsWith("http")
                                                            ? selectedProduct.lineId
                                                            : `https://line.me/ti/p/~${selectedProduct.lineId.replace(/^@/, "")}`
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <img
                                                        src="https://upload.wikimedia.org/wikipedia/commons/2/2e/LINE_New_App_Icon_%282020-12%29.png"
                                                        alt="LINE"
                                                    />
                                                    <span>LINE</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </BottomSheet>
        </MainLayout>
    );
}
