import { useCallback, useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import why1 from "../../assets/index/why/1.png";
import why2 from "../../assets/index/why/2.png";
import why3 from "../../assets/index/why/3.png";
import why4 from "../../assets/index/why/4.png";
import why5 from "../../assets/index/why/5.png";
import why6 from "../../assets/index/why/6.png";
import why7 from "../../assets/index/why/7.png";

const slides = [
    { src: why1, alt: "ทำไมถึงสร้างยายเภา — ภาพที่ 1" },
    { src: why2, alt: "ทำไมถึงสร้างยายเภา — ภาพที่ 2" },
    { src: why3, alt: "ทำไมถึงสร้างยายเภา — ภาพที่ 3" },
    { src: why4, alt: "ทำไมถึงสร้างยายเภา — ภาพที่ 4" },
    { src: why5, alt: "ทำไมถึงสร้างยายเภา — ภาพที่ 5" },
    { src: why6, alt: "ทำไมถึงสร้างยายเภา — ภาพที่ 6" },
    { src: why7, alt: "ทำไมถึงสร้างยายเภา — ภาพที่ 7" },
] as const;

export default function StoryCarousel() {
    const [index, setIndex] = useState(0);
    const indexRef = useRef(0);
    const total = slides.length;

    const go = useCallback((next: number) => {
        const wrapped = ((next % total) + total) % total;
        indexRef.current = wrapped;
        setIndex(wrapped);
    }, [total]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") go(indexRef.current - 1);
            if (e.key === "ArrowRight") go(indexRef.current + 1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [go]);

    // Prefetch every slide once so switching never waits on decode/network.
    useEffect(() => {
        for (const slide of slides) {
            const img = new Image();
            img.src = slide.src;
        }
    }, []);

    return (
        <div className="mk-carousel" role="region" aria-roledescription="carousel" aria-label="ภาพสตอรี่ยายเภา">
            <div className="mk-carousel__stage">
                <div className="mk-carousel__stack">
                    {/* Spacer keeps stage height from the first slide — no layout jump */}
                    <img
                        src={slides[0].src}
                        alt=""
                        aria-hidden
                        className="mk-carousel__spacer"
                        decoding="async"
                    />
                    {slides.map((slide, i) => (
                        <figure
                            key={slide.src}
                            className={`mk-carousel__slide${i === index ? " is-active" : ""}`}
                            aria-hidden={i !== index}
                        >
                            <img
                                src={slide.src}
                                alt={slide.alt}
                                className="mk-carousel__img"
                                decoding="async"
                                draggable={false}
                            />
                        </figure>
                    ))}
                </div>

                <button
                    type="button"
                    className="mk-carousel__nav mk-carousel__nav--prev"
                    aria-label="ภาพก่อนหน้า"
                    onClick={() => go(index - 1)}
                >
                    <LuChevronLeft size={18} />
                </button>
                <button
                    type="button"
                    className="mk-carousel__nav mk-carousel__nav--next"
                    aria-label="ภาพถัดไป"
                    onClick={() => go(index + 1)}
                >
                    <LuChevronRight size={18} />
                </button>
            </div>

            <div className="mk-carousel__footer">
                <div className="mk-carousel__dots" role="tablist" aria-label="เลือกภาพ">
                    {slides.map((slide, i) => (
                        <button
                            key={slide.src}
                            type="button"
                            role="tab"
                            aria-selected={i === index}
                            aria-label={`ไปภาพที่ ${i + 1}`}
                            className={`mk-carousel__dot${i === index ? " is-active" : ""}`}
                            onClick={() => go(i)}
                        />
                    ))}
                </div>
                <p className="mk-carousel__count" aria-live="polite">
                    {index + 1} / {total}
                </p>
            </div>
        </div>
    );
}
