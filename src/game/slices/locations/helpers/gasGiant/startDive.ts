import type { SetState, GameStore } from "@/game/types";
import type { DiveState } from "@/game/types/exploration";
import { pickDiveEvent } from "./events";

export function startDive(
    locationId: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();

    if (state.probes <= 0) {
        get().addLog(
            "🚫 Нет зондов. Купите зонды на ближайшей станции.",
            "warning",
        );
        return;
    }

    const location = state.currentSector?.locations.find(
        (l) => l.id === locationId,
    );

    if (!location || location.type !== "gas_giant") {
        get().addLog("Локация не найдена", "error");
        return;
    }

    const cooldownRemaining =
        location.gasGiantLastDiveAt !== undefined
            ? 10 - (state.turn - location.gasGiantLastDiveAt)
            : 0;

    if (cooldownRemaining > 0) {
        get().addLog(
            `Зонд восстанавливается. Погружение доступно через ${cooldownRemaining} ходов.`,
            "warning",
        );
        return;
    }

    const initialDive: DiveState = {
        locationId,
        currentDepth: 1,
        rewards: {
            alien_biology: 0,
            rare_minerals: 0,
            void_membrane: 0,
        },
        currentEvent: pickDiveEvent(1),
        finished: false,
    };

    set((s) => ({ activeDive: initialDive, probes: s.probes - 1 }));
    get().addLog("🪸 Зонд погружается в атмосферу газового гиганта...", "info");
}
