// HiDPI helper for all game canvases. Sizes the backing store to the display's
// devicePixelRatio and scales the context so callers keep drawing in CSS pixels.
// CSS classes on the <canvas> (w-full / max-w-full / …) still control the
// on-screen size — this only sharpens the buffer.
// Returns true when the backing store was (re)created, so callers can invalidate
// caches (e.g. regenerate a starfield).
export function setupHiDPICanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    cssWidth: number,
    cssHeight: number,
): boolean {
    const dpr = window.devicePixelRatio || 1;
    const bufferWidth = Math.max(1, Math.round(cssWidth * dpr));
    const bufferHeight = Math.max(1, Math.round(cssHeight * dpr));
    const changed =
        canvas.width !== bufferWidth || canvas.height !== bufferHeight;
    if (changed) {
        canvas.width = bufferWidth;
        canvas.height = bufferHeight;
    }
    // Reset to the DPR base transform; callers compose zoom/pan on top via
    // save()/translate()/scale()/restore().
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return changed;
}
