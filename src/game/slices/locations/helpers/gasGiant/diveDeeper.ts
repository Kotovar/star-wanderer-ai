import type { SetState, GameStore } from "@/game/types";
import type { DiveDepth } from "@/game/types/exploration";
import { pickDiveEvent } from "./events";
import { GAS_GIANT_MAX_DEPTH } from "./constants";

export function diveDeeper(set: SetState, get: () => GameStore): void {
    const state = get();
    const dive = state.activeDive;
    if (!dive || dive.currentEvent || dive.finished) return;

    if (dive.currentDepth >= GAS_GIANT_MAX_DEPTH) {
        get().addLog("Глубже нырнуть невозможно — достигнуто ядро шторма.", "warning");
        return;
    }

    const nextDepth = (dive.currentDepth + 1) as DiveDepth;
    const nextEvent = pickDiveEvent(nextDepth);

    set((s) => {
        if (!s.activeDive) return {};
        return {
            activeDive: {
                ...s.activeDive,
                currentDepth: nextDepth,
                currentEvent: nextEvent,
            },
        };
    });

    const depthNames: Record<DiveDepth, string> = {
        1: "Верхняя атмосфера",
        2: "Облачный пояс",
        3: "Абиссальная зона",
        4: "Ядро шторма",
    };
    get().addLog(`🔽 Погружение на слой ${nextDepth}: ${depthNames[nextDepth]}`, "info");
}
