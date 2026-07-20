import type { SetState, GameStore } from "@/game/types";
import { planetHasFeature } from "@/game/planets";
import { patchLocation } from "@/game/utils/patchLocation";

/**
 * Орбитальное сканирование пустой планеты сканером корабля.
 * Раскрывает особенности планеты и точку интереса без траты попыток разведки.
 * Плотная ионосфера блокирует сканирование — раскрывается только она.
 * Стоит 1 ход.
 */
export const orbitalScan = (
    planetId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    const hasScanner = state.ship.modules.some(
        (m) =>
            m.type === "scanner" &&
            m.health > 0 &&
            !m.disabled &&
            !m.manualDisabled,
    );
    if (!hasScanner) {
        get().addLog("Требуется рабочий модуль сканера!", "error");
        return;
    }

    const planet = state.currentSector?.locations.find(
        (l) => l.id === planetId,
    );
    if (!planet || planet.orbitalScanned) return;

    const blocked = planetHasFeature(planetId, "dense_ionosphere");

    set((s) => ({
        turn: s.turn + 1,
        ...patchLocation(s, planetId, { orbitalScanned: true }),
    }));

    get().addLog(
        blocked
            ? "🌩️ Плотная ионосфера искажает сигнал — сканирование с орбиты невозможно."
            : "📡 Орбитальное сканирование завершено: данные о поверхности получены.",
        blocked ? "warning" : "info",
    );
    get().updateShipStats();
};
