type AssetPlaceholderProps = {
    label: string;
    hint?: string;
    /** When set, shows the image instead of the dashed placeholder box. */
    src?: string;
    /** `auto` = frame follows the image's natural size (no fixed ratio). */
    aspect?: "hero" | "wide" | "square" | "portrait" | "phone" | "auto";
    fit?: "cover" | "contain";
    /** Show border / soft card around the image. Default true. */
    framed?: boolean;
    className?: string;
};

const aspectClass: Record<NonNullable<AssetPlaceholderProps["aspect"]>, string> = {
    hero: "aspect-[16/10] md:aspect-[21/9]",
    wide: "aspect-[16/9]",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    phone: "aspect-[9/16] max-h-[28rem]",
    auto: "asset-media--auto",
};

export default function AssetPlaceholder({
    label,
    hint,
    src,
    aspect = "wide",
    fit = "cover",
    framed = true,
    className = "",
}: AssetPlaceholderProps) {
    if (src) {
        const isAuto = aspect === "auto";
        return (
            <div
                className={`asset-media ${framed ? "" : "asset-media--bare"} ${isAuto ? "asset-media--auto" : aspectClass[aspect]} ${className}`.trim()}
            >
                <img
                    src={src}
                    alt={label}
                    className={
                        isAuto
                            ? "asset-media__img asset-media__img--natural"
                            : `asset-media__img asset-media__img--${fit}`
                    }
                    loading="lazy"
                    decoding="async"
                />
            </div>
        );
    }

    return (
        <div
            className={`asset-placeholder ${aspect === "auto" ? "aspect-[16/9]" : aspectClass[aspect]} ${className}`.trim()}
            role="img"
            aria-label={label}
        >
            <div className="asset-placeholder__inner">
                <span className="asset-placeholder__tag">ใส่รูป / Asset</span>
                <p className="asset-placeholder__label">{label}</p>
                {hint ? <p className="asset-placeholder__hint">{hint}</p> : null}
            </div>
        </div>
    );
}
