import { useState, useRef, useEffect, useCallback } from "react";

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
const ZOOM_SENSITIVITY = 0.001;
export const DRAG_THRESHOLD = 5; // Minimum pixels to move before considering it a drag

const clampZoom = (zoom: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export interface MapOffset {
    x: number;
    y: number;
}

/**
 * Общая zoom/pan-механика канвас-карт (GalaxyMap, SectorMap):
 * плавный зум к цели, колесо мыши, кнопки +/−/сброс и pinch-to-zoom.
 * Drag-пан остаётся в компонентах — он у карт реализован по-разному.
 */
export function useMapZoomPan({
    initialZoom,
    initialOffset,
    persistZoom,
    persistOffset,
}: {
    initialZoom: number;
    initialOffset: MapOffset;
    persistZoom: (zoom: number) => void;
    persistOffset: (offset: MapOffset) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [zoom, setZoom] = useState(initialZoom);
    const [offset, setOffset] = useState(initialOffset);
    const [targetZoom, setTargetZoom] = useState<number | null>(null);
    const zoomAnimationRef = useRef<number | null>(null);

    // Pinch-to-zoom state
    const pinchStartDist = useRef(0);
    const pinchStartZoom = useRef(1);
    const isPinchingRef = useRef(false);

    // Zoom animation effect
    useEffect(() => {
        if (targetZoom === null) return;

        const animateZoom = () => {
            setZoom((prevZoom) => {
                const diff = targetZoom - prevZoom;
                const step = diff * 0.15; // Smooth easing

                if (Math.abs(diff) < 0.001) {
                    setZoom(targetZoom);
                    setTargetZoom(null);
                    persistZoom(targetZoom);
                    return targetZoom;
                }

                return prevZoom + step;
            });
            zoomAnimationRef.current = requestAnimationFrame(animateZoom);
        };

        zoomAnimationRef.current = requestAnimationFrame(animateZoom);

        return () => {
            if (zoomAnimationRef.current) {
                cancelAnimationFrame(zoomAnimationRef.current);
            }
        };
    }, [targetZoom, persistZoom]);

    // Handle wheel zoom — native non-passive listener so preventDefault works
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = -e.deltaY * ZOOM_SENSITIVITY;
            setTargetZoom(clampZoom(zoom * (1 + delta)));
        };
        canvas.addEventListener("wheel", handleWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", handleWheel);
    }, [zoom]);

    // Zoom in/out buttons
    const handleZoomIn = useCallback(() => {
        setTargetZoom((prev) => {
            const currentZoom = prev !== null ? prev : zoom;
            const newZoom = Math.min(MAX_ZOOM, currentZoom * 1.3);
            persistZoom(newZoom);
            return newZoom;
        });
    }, [zoom, persistZoom]);

    const handleZoomOut = useCallback(() => {
        setTargetZoom((prev) => {
            const currentZoom = prev !== null ? prev : zoom;
            const newZoom = Math.max(MIN_ZOOM, currentZoom / 1.3);
            persistZoom(newZoom);
            return newZoom;
        });
    }, [zoom, persistZoom]);

    // Reset zoom and pan
    const handleReset = useCallback(() => {
        setTargetZoom(1);
        persistZoom(1);
        const resetOffset = { x: 0, y: 0 };
        setOffset(resetOffset);
        persistOffset(resetOffset);
    }, [persistZoom, persistOffset]);

    /** Начало pinch-жеста (два пальца). Вызывать из onTouchStart. */
    const beginPinch = useCallback(
        (touches: React.TouchList) => {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            pinchStartDist.current = Math.hypot(dx, dy);
            pinchStartZoom.current = zoom;
            isPinchingRef.current = true;
        },
        [zoom],
    );

    /**
     * Обновление pinch-зума. Вызывать из onTouchMove.
     * Возвращает true, если жест обработан (пан не нужен).
     */
    const movePinch = useCallback(
        (touches: React.TouchList): boolean => {
            if (!isPinchingRef.current || touches.length !== 2) return false;
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (pinchStartDist.current > 0) {
                const ratio = dist / pinchStartDist.current;
                const newZoom = clampZoom(pinchStartZoom.current * ratio);
                setZoom(newZoom);
                setTargetZoom(null);
                persistZoom(newZoom);
            }
            return true;
        },
        [persistZoom],
    );

    return {
        canvasRef,
        zoom,
        setZoom,
        offset,
        setOffset,
        targetZoom,
        setTargetZoom,
        isPinchingRef,
        beginPinch,
        movePinch,
        handleZoomIn,
        handleZoomOut,
        handleReset,
    };
}
