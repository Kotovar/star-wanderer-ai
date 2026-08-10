import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";
import { playSound } from "@/sounds";
import { calculateRepairCost } from "./calculateRepairCost";
import { ServiceCostResult } from "./types";
import { getSectorRule } from "@/game/galaxy/sectorRules";

/**
 * Выполняет ремонт корабля
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const repairShip = (set: SetState, get: () => GameStore): void => {
    const state = get();
    if (getSectorRule(state.currentSector?.ruleId)?.restrictions?.noRepair) {
        get().addLog(i18nStore.t("sector_rules.logs.repair_blocked"), "warning");
        return;
    }
    const raceId = state.currentLocation?.dominantRace;
    const { cost, canUse }: ServiceCostResult = calculateRepairCost(
        state,
        raceId,
    );

    // Проверка возможности ремонта
    if (!canUse) {
        get().addLog("services.not_needed_repair", "warning");
        return;
    }

    // Проверка кредитов
    if (state.credits < cost) {
        get().addLog( i18nStore.t("game_logs.repairShip_1"), "error");
        return;
    }

    // Ремонт всех модулей
    set((s) => ({
        credits: s.credits - cost,
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) => ({
                ...m,
                health: m.maxHealth,
            })),
        },
    }));

    get().addLog( i18nStore.t("game_logs.repairShip_2", { cost }), "info");
    playSound("world_repair");
    get().updateShipStats();
};
