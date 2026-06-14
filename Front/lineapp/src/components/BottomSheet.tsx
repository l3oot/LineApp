import {
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const CLOSE_MS = 240;
const DISMISS_PX = 96;

type BottomSheetProps = {
    open: boolean;
    /** เรียกหลัง animation ปิดเสร็จ */
    onClose: () => void;
    /** เรียกทันทีเมื่อผู้ใช้เริ่มปิด (backdrop / drag / ปุ่ม X) */
    onRequestClose?: () => void;
    children: ReactNode;
    panelClassName?: string;
    backdropClassName?: string;
    dragDisabled?: boolean;
    closeOnBackdrop?: boolean;
};

export default function BottomSheet({
    open,
    onClose,
    onRequestClose,
    children,
    panelClassName = "",
    backdropClassName = "z-50",
    dragDisabled = false,
    closeOnBackdrop = true,
}: BottomSheetProps) {
    const [present, setPresent] = useState(open);
    const [phase, setPhase] = useState<"enter" | "idle" | "exit">("enter");
    const [offsetY, setOffsetY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startPointerY = useRef(0);
    const dragStartOffset = useRef(0);
    const closingRef = useRef(false);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const finishClose = useCallback(() => {
        closingRef.current = false;
        setPresent(false);
        setPhase("enter");
        setOffsetY(0);
        setIsDragging(false);
    }, []);

    const animateClose = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        setIsDragging(false);
        setOffsetY(0);
        setPhase("exit");
        window.setTimeout(() => {
            finishClose();
            onCloseRef.current();
        }, CLOSE_MS);
    }, [finishClose]);

    const requestClose = useCallback(() => {
        if (closingRef.current) return;
        if (onRequestClose) {
            onRequestClose();
            return;
        }
        animateClose();
    }, [animateClose, onRequestClose]);

    useLayoutEffect(() => {
        if (open) {
            closingRef.current = false;
            setPresent(true);
            setPhase("enter");
            setOffsetY(0);
            setIsDragging(false);
            const frame = window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => setPhase("idle"));
            });
            return () => window.cancelAnimationFrame(frame);
        }

        if (present && !closingRef.current) {
            closingRef.current = true;
            setIsDragging(false);
            setOffsetY(0);
            setPhase("exit");
            const timer = window.setTimeout(() => {
                finishClose();
                onCloseRef.current();
            }, CLOSE_MS);
            return () => window.clearTimeout(timer);
        }
    }, [open, present, finishClose]);

    const onHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (dragDisabled || phase === "exit") return;
        event.preventDefault();
        setIsDragging(true);
        startPointerY.current = event.clientY;
        dragStartOffset.current = offsetY;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onHandlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isDragging || dragDisabled) return;
        const delta = Math.max(0, event.clientY - startPointerY.current);
        setOffsetY(delta);
    };

    const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        setIsDragging(false);
        const delta = Math.max(0, event.clientY - startPointerY.current);
        if (delta > DISMISS_PX) {
            requestClose();
            return;
        }
        setOffsetY(0);
    };

    if (!open && !present) {
        return null;
    }

    const panelTransform =
        offsetY > 0
            ? `translateY(${offsetY}px)`
            : phase === "enter" || phase === "exit"
              ? "translateY(100%)"
              : "translateY(0)";

    const backdropOpacity =
        phase === "enter"
            ? 0
            : phase === "exit"
              ? 0
              : Math.max(0, 0.35 * (1 - offsetY / 320));

    return createPortal(
        <div
            className={`fixed inset-0 ${backdropClassName}`}
            style={{
                backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
                transition: isDragging ? "none" : `background-color ${CLOSE_MS}ms ease-out`,
            }}
            onClick={closeOnBackdrop && !dragDisabled ? requestClose : undefined}
        >
            <div
                role="dialog"
                aria-modal="true"
                className={`absolute inset-x-0 bottom-0 rounded-t-[16px] bg-[var(--surface)] shadow-[0_-10px_22px_rgba(0,0,0,0.12)] ${panelClassName}`}
                style={{
                    transform: panelTransform,
                    transition: isDragging ? "none" : `transform ${CLOSE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <div
                    className={`flex touch-none justify-center px-4 pt-2 pb-1 ${
                        dragDisabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                    }`}
                    onPointerDown={onHandlePointerDown}
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                >
                    <div className="h-1 w-12 rounded-full bg-[var(--border)]" aria-hidden />
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );
}
