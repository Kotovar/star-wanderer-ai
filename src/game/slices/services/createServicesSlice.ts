import type { GameStore, SetState } from "@/game/types";
import { getSectorRule } from "@/game/galaxy/sectorRules";
import { store as i18nStore } from "@/lib/useTranslation";
import {
    getNebulaFrontDispersal,
    getNebulaFrontProgress,
    NEBULA_FRONT_CRISIS_ID,
    NEBULA_FRONT_STABILIZER_COST,
} from "@/game/crises/nebulaFront";
import {
    calculateRepairCost,
    calculateHealCost,
    repairShip as repairShipAction,
    healCrew as healCrewAction,
    installModuleFromCargo as installModuleFromCargoAction,
    scrapModule as scrapModuleAction,
    removeWeapon as removeWeaponAction,
    cureMutation as cureMutationAction,
    treatNegativeTrait as treatNegativeTraitAction,
    type ServiceCostResult,
} from "./helpers";

/**
 * Интерфейс ServicesSlice
 */
export interface ServicesSlice {
    /**
     * Ремонт всех модулей корабля
     * Восстанавливает здоровье всех модулей до максимального
     */
    repairShip: () => void;
    /**
     * Лечение экипажа
     * Восстанавливает здоровье и частично счастье
     */
    healCrew: () => void;
    /**
     * Устанавливает модуль из грузового отсека
     * @param cargoIndex - Индекс в грузовом отсеке
     * @param x - Координата X
     * @param y - Координата Y
     */
    installModuleFromCargo: (cargoIndex: number, x: number, y: number) => void;
    /**
     * Проверяет, можно ли ремонтировать корабль
     * @returns true если есть повреждённые модули
     */
    canRepairShip: () => boolean;
    /**
     * Проверяет, можно ли лечить экипаж
     * @returns true если есть раненые члены экипажа
     */
    canHealCrew: () => boolean;
    /**
     * Рассчитывает стоимость ремонта
     * @returns Стоимость ремонта и процент повреждения
     */
    getRepairCost: () => ServiceCostResult;
    /**
     * Рассчитывает стоимость лечения
     * @returns Стоимость лечения и процент повреждения
     */
    getHealCost: () => ServiceCostResult;

    /**
     * Уничтожает модуль корабля и возвращает деньги
     * @param moduleId - ID модуля для уничтожения
     */
    scrapModule: (moduleId: number) => void;

    /**
     * Снимает оружие с боевой палубы и возвращает 50% его стоимости
     * @param moduleId - ID модуля weaponbay
     * @param weaponIndex - Индекс слота оружия
     */
    removeWeapon: (moduleId: number, weaponIndex: number) => void;

    /**
     * Лечит мутацию у члена экипажа (требует технологию "Ксенобиология")
     * @param crewId - ID члена экипажа
     * @param traitId - ID мутации для лечения
     */
    cureMutation: (crewId: number, traitId: string) => void;
    treatNegativeTrait: (crewId: number, traitId: string) => void;
    stabilizeNebulaFront: () => void;
}

/**
 * Создаёт services слайс для обработки услуг (ремонт, лечение и т.д.)
 */
export const createServicesSlice = (
    set: SetState,
    get: () => GameStore,
): ServicesSlice => ({
    repairShip: () => repairShipAction(set, get),

    healCrew: () => healCrewAction(set, get),

    installModuleFromCargo: (cargoIndex, x, y) =>
        installModuleFromCargoAction(set, get, cargoIndex, x, y),

    canRepairShip: () => {
        const state = get();
        const raceId = state.currentLocation?.dominantRace;
        const { canUse } = calculateRepairCost(state, raceId);
        const repairBlocked =
            getSectorRule(state.currentSector?.ruleId)?.restrictions?.noRepair === true;
        return !repairBlocked && canUse;
    },

    canHealCrew: () => {
        const state = get();
        const raceId = state.currentLocation?.dominantRace;
        const { canUse } = calculateHealCost(state, raceId);
        return canUse;
    },

    getRepairCost: () => {
        const state = get();
        const raceId = state.currentLocation?.dominantRace;
        return calculateRepairCost(state, raceId);
    },

    getHealCost: () => {
        const state = get();
        const raceId = state.currentLocation?.dominantRace;
        return calculateHealCost(state, raceId);
    },

    scrapModule: (moduleId) => scrapModuleAction(moduleId, set, get),

    removeWeapon: (moduleId, weaponIndex) =>
        removeWeaponAction(moduleId, weaponIndex, set, get),

    cureMutation: (crewId, traitId) =>
        cureMutationAction(crewId, traitId, set, get),

    treatNegativeTrait: (crewId, traitId) =>
        treatNegativeTraitAction(crewId, traitId, set, get),

    stabilizeNebulaFront: () => {
        const state = get();
        const nebulaId = getNebulaFrontDispersal(
            state.activeCrisis,
            state.galaxy.nebulae,
            state.research.resources,
            state.currentLocation?.stationType === "research",
        );
        if (!nebulaId) {
            if (state.activeCrisis?.id === NEBULA_FRONT_CRISIS_ID) {
                get().addLog(
                    i18nStore.t("game_logs.nebula_front_stabilizer_unavailable"),
                    "warning",
                );
            }
            return;
        }

        set((s) => ({
            research: {
                ...s.research,
                resources: {
                    ...s.research.resources,
                    quantum_crystals: Math.max(
                        0,
                        (s.research.resources.quantum_crystals ?? 0) -
                            NEBULA_FRONT_STABILIZER_COST.quantum_crystals,
                    ),
                    energy_samples: Math.max(
                        0,
                        (s.research.resources.energy_samples ?? 0) -
                            NEBULA_FRONT_STABILIZER_COST.energy_samples,
                    ),
                    void_membrane: Math.max(
                        0,
                        (s.research.resources.void_membrane ?? 0) -
                            NEBULA_FRONT_STABILIZER_COST.void_membrane,
                    ),
                },
            },
            galaxy: {
                ...s.galaxy,
                nebulae: s.galaxy.nebulae.filter(
                    (nebula) => nebula.id !== nebulaId,
                ),
            },
        }));

        const progress = getNebulaFrontProgress(
            get().activeCrisis,
            get().galaxy.nebulae,
        );
        get().addLog(
            i18nStore.t("game_logs.nebula_front_dispersed", {
                remaining: progress?.remaining ?? 0,
            }),
            "info",
        );
        get().saveGame();
    },
});
