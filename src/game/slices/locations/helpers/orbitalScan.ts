import { store as i18nStore } from "@/lib/useTranslation";
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
        get().addLog( i18nStore.t("game_logs.orbitalScan_1"), "error");
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
        i18nStore.t(blocked ? "game_logs.orbital_blocked" : "game_logs.orbital_done"),
        blocked ? "warning" : "info",
    );
    get().updateShipStats();
};
