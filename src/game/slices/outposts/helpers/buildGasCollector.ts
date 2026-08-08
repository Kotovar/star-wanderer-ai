import { store as i18nStore } from "@/lib/useTranslation";
import {
    GAS_BY_ATMOSPHERE,
    GAS_COLLECTOR_COST,
} from "@/game/constants/outposts";
import { patchLocation } from "@/game/utils/patchLocation";
import type { GameStore, SetState } from "@/game/types";
import type { Outpost } from "@/game/types/outposts";
import { getGasCollectorBlocker } from "./canBuildGasCollector";

export function buildGasCollector(
    locationId: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const location = state.currentSector?.locations.find(
        (l) => l.id === locationId,
    );

    const blocker = getGasCollectorBlocker(state, location);
    if (blocker) {
        get().addLog(
            i18nStore.t(`game_logs.outpost_blocked_${blocker}`),
            "error",
        );
        return;
    }
    // getGasCollectorBlocker уже отсеял всё это, но сузить типы иначе нечем
    if (!location || !state.currentSector || !location.gasGiantAtmosphere) return;

    const gas = GAS_BY_ATMOSPHERE[location.gasGiantAtmosphere];
    const outpost: Outpost = {
        id: `outpost-${locationId}-${state.turn}`,
        kind: "gas_collector",
        locationId,
        sectorId: state.currentSector.id,
        builtAtTurn: state.turn,
        bunker: {},
    };

    set((s) => ({
        turn: s.turn + 1,
        credits: s.credits - GAS_COLLECTOR_COST.credits,
        research: {
            ...s.research,
            resources: Object.entries(GAS_COLLECTOR_COST.resources).reduce(
                (acc, [resource, amount]) => ({
                    ...acc,
                    [resource]:
                        (acc[resource as keyof typeof acc] ?? 0) - amount,
                }),
                { ...s.research.resources },
            ),
        },
        outposts: [...s.outposts, outpost],
        // Отметка живёт и в локации: сектор пересобирается из galaxy при
        // перезаходе, и без patchLocation значок пропал бы с карты
        ...patchLocation(s, locationId, { outpostId: outpost.id }),
    }));

    get().addLog(
        i18nStore.t("game_logs.outpost_built_gas_collector", {
            location: i18nStore.t(location.name),
            gas: i18nStore.t(`gases.${gas}.name`),
        }),
        "info",
    );
    get().updateShipStats();
}
