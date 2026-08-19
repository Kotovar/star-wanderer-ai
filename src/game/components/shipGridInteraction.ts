import type { Module } from "@/game/types";

export type ModulePointerUpAction =
    | { type: "open"; moduleId: number }
    | { type: "move"; moduleId: number; x: number; y: number }
    | null;

const MODULE_DRAG_THRESHOLD = 5;
export const SHIP_GRID_VIEWBOX_PADDING = 12;

export const getShipGridPoint = (
    clientX: number,
    clientY: number,
    bounds: Pick<DOMRect, "left" | "top" | "width" | "height">,
    svgSize: number,
): { x: number; y: number } => {
    const viewBoxSize = svgSize + SHIP_GRID_VIEWBOX_PADDING * 2;

    return {
        x:
            (clientX - bounds.left) * (viewBoxSize / bounds.width) -
            SHIP_GRID_VIEWBOX_PADDING,
        y:
            (clientY - bounds.top) * (viewBoxSize / bounds.height) -
            SHIP_GRID_VIEWBOX_PADDING,
    };
};

export const hasModulePointerDragged = (
    start: { x: number; y: number } | null,
    current: { x: number; y: number },
    alreadyDragged: boolean,
): boolean =>
    alreadyDragged ||
    Boolean(
        start &&
        Math.hypot(current.x - start.x, current.y - start.y) >=
            MODULE_DRAG_THRESHOLD,
    );

export const resolveModulePointerUp = (
    module: Pick<Module, "id" | "x" | "y"> | null,
    tempPos: { x: number; y: number } | null,
    canMove: boolean,
    canPlace: boolean,
    pointerMoved: boolean,
): ModulePointerUpAction => {
    if (!module || !tempPos) return null;
    if (!pointerMoved) return { type: "open", moduleId: module.id };

    const moved = module.x !== tempPos.x || module.y !== tempPos.y;
    if (!moved || !canMove || !canPlace) return null;

    return {
        type: "move",
        moduleId: module.id,
        x: tempPos.x,
        y: tempPos.y,
    };
};
