import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
    children: ReactNode;
    className?: string;
    /** Stagger delay in ms once the block enters view */
    delay?: number;
    as?: "div" | "section" | "article" | "li" | "header";
    /** Skip scroll wait — show immediately */
    instant?: boolean;
};

/**
 * Scroll-stage reveal. Content is visible by default; JS arms the hidden state
 * so a failed script never blanks the page.
 */
export default function Reveal({
    children,
    className = "",
    delay = 0,
    as: Tag = "div",
    instant = false,
}: RevealProps) {
    const ref = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (instant || reduce) {
            node.classList.add("is-in");
            return;
        }

        node.classList.add("mk-reveal--armed");

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    node.classList.add("is-in");
                    observer.unobserve(node);
                }
            },
            { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [instant]);

    const style = delay
        ? ({ "--mk-reveal-delay": `${delay}ms` } as CSSProperties)
        : undefined;

    return (
        <Tag
            ref={ref as never}
            className={`mk-reveal${className ? ` ${className}` : ""}`}
            style={style}
        >
            {children}
        </Tag>
    );
}
