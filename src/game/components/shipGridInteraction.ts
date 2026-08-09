import type { Module } from "@/game/types";

export type ModulePointerUpAction =
    | { type: "open"; moduleId: number }
    | { type: "move"; moduleId: number; x: number; y: number }
    | null;

const MODULE_DRAG_THRESHOLD = 5;

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
