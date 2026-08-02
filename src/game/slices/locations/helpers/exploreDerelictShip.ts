import { store as i18nStore } from "@/lib/useTranslation";
import type {
    CrewMember,
    DerelictApproach,
    GameStore,
    Module,
    SetState,
} from "@/game/types";
import { MODULE_RECIPES } from "@/game/constants/crafting";
import { addTradeGood } from "@/game/slices/ship/helpers";
import { patchLocation } from "@/game/utils/patchLocation";
import { SCOUT_BASE_EXP } from "@/game/constants/experience";
import type { ModuleRecipeId } from "@/game/types/crafting";
import { handleDerelictRecoveryContracts } from "@/game/slices/contracts/helpers/handleDerelictRecoveryContracts";
import {
    DERELICT_APPROACH_CONFIG,
    DERELICT_RISK_CHANCE,
} from "@/game/slices/locations/constants";
import { isModuleActive } from "@/game/modules/utils";

// Шанс найти рецепт модуля при исследовании обломков (10%)
const DERELICT_RECIPE_CHANCE = 0.99;
// const DERELICT_RECIPE_CHANCE = 0.1;

// Лут из обломков
const DERELICT_LOOT = {
    spares: { min: 2, max: 6 },
    electronics: { min: 1, max: 4 },
    rare_minerals: { min: 0, max: 3 },
};

const ALL_RECIPE_IDS = Object.keys(MODULE_RECIPES) as ModuleRecipeId[];

type DerelictApproachBlockReason =
    | "scout"
    | "engineer"
    | "scientist"
    | "scanner";

const getActiveScanner = (modules: Module[]) =>
    modules.find(
        (module) =>
            isModuleActive(module) &&
            (module.type === "scanner" || module.type === "deep_survey_array"),
    );

export const getDerelictApproachBlockReason = (
    approach: DerelictApproach,
    crew: CrewMember[],
    modules: Module[],
): DerelictApproachBlockReason | null => {
    if (!crew.some((member) => member.profession === "scout")) return "scout";
    if (
        approach === "engineering" &&
        !crew.some((member) => member.profession === "engineer")
    ) {
        return "engineer";
    }
    if (
        approach === "archive" &&
        !crew.some((member) => member.profession === "scientist")
    ) {
        return "scientist";
    }
    if (approach === "archive" && !getActiveScanner(modules)) {
        return "scanner";
    }

    return null;
};

/**
 * Исследует покинутый корабль разведчиком.
 * Однократное действие: даёт spares/electronics/rare_minerals и шанс рецепта модуля.
 */
export const exploreDerelictShip = (
    locationId: string,
    approach: DerelictApproach,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    const scouts = state.crew.filter((c) => c.profession === "scout");
    const blockedReason = getDerelictApproachBlockReason(
        approach,
        state.crew,
        state.ship.modules,
    );
    if (blockedReason) {
        get().addLog(
            i18nStore.t(`game_logs.exploreDerelictShip_requires_${blockedReason}`),
            "error",
        );
        return;
    }

    const location = state.currentSector?.locations.find(
        (l) => l.id === locationId,
    );
    if (!location || location.type !== "derelict_ship") {
        get().addLog( i18nStore.t("game_logs.exploreDerelictShip_2"), "error");
        return;
    }

    if (location.derelictExplored) {
        get().addLog( i18nStore.t("game_logs.exploreDerelictShip_3"), "warning");
        return;
    }

    const scout = scouts.reduce((best, c) =>
        (c.level ?? 1) > (best.level ?? 1) ? c : best,
    );

    const config = DERELICT_APPROACH_CONFIG[approach];
    const cargoApproach = approach !== "archive";
    const sparesQty = cargoApproach
        ? Math.floor(
              (DERELICT_LOOT.spares.min +
                  Math.floor(
                      Math.random() *
                          (DERELICT_LOOT.spares.max -
                              DERELICT_LOOT.spares.min +
                              1),
                  )) *
                  (config.sparesMultiplier ?? 1),
          )
        : 0;
    const electronicsQty = cargoApproach
        ? Math.floor(
              (DERELICT_LOOT.electronics.min +
                  Math.floor(
                      Math.random() *
                          (DERELICT_LOOT.electronics.max -
                              DERELICT_LOOT.electronics.min +
                              1),
                  )) *
                  (config.electronicsMultiplier ?? 1),
          )
        : 0;
    const rareMineralsQty =
        cargoApproach && Math.random() < 0.5
            ? DERELICT_LOOT.rare_minerals.min +
              Math.floor(
                  Math.random() *
                      (DERELICT_LOOT.rare_minerals.max -
                          DERELICT_LOOT.rare_minerals.min +
                          1),
              )
            : 0;
    const foundRecipe =
        approach === "boarding" && Math.random() < DERELICT_RECIPE_CHANCE
            ? pickUncollectedRecipe(state.moduleRecipes)
            : null;
    const ancientData = config.ancientData ?? 0;
    const techSalvage = config.techSalvage ?? 0;
    const riskTriggered = Math.random() < DERELICT_RISK_CHANCE;

    const scoutDamage =
        approach === "boarding" && riskTriggered
            ? Math.max(0, Math.min(config.scoutDamage ?? 0, scout.health - 1))
            : 0;
    const damageCandidates =
        approach === "engineering"
            ? state.ship.modules.filter(isModuleActive)
            : [];
    const damageTarget =
        approach === "archive"
            ? getActiveScanner(state.ship.modules)
            : riskTriggered
              ? damageCandidates[
                  Math.floor(Math.random() * damageCandidates.length)
                ]
              : undefined;
    const configuredModuleDamage =
        approach === "archive" ? config.scannerDamage : config.moduleDamage;
    const moduleDamage =
        riskTriggered && damageTarget
            ? Math.max(
                  0,
                  Math.min(configuredModuleDamage ?? 0, damageTarget.health),
              )
            : 0;

    get().gainExp(scout, SCOUT_BASE_EXP);

    const lootResult = {
        approach,
        spares: sparesQty > 0 ? sparesQty : undefined,
        electronics: electronicsQty > 0 ? electronicsQty : undefined,
        rare_minerals: rareMineralsQty > 0 ? rareMineralsQty : undefined,
        ancient_data: ancientData > 0 ? ancientData : undefined,
        tech_salvage: techSalvage > 0 ? techSalvage : undefined,
        moduleRecipeId: foundRecipe ?? undefined,
        crewDamage: scoutDamage > 0 ? scoutDamage : undefined,
        damagedModuleName:
            moduleDamage > 0 ? damageTarget?.name : undefined,
        moduleDamage: moduleDamage > 0 ? moduleDamage : undefined,
    };

    set((s) => {
        let newTradeGoods = s.ship.tradeGoods;
        if (sparesQty > 0)
            newTradeGoods = addTradeGood(newTradeGoods, "spares", sparesQty);
        if (electronicsQty > 0)
            newTradeGoods = addTradeGood(
                newTradeGoods,
                "electronics",
                electronicsQty,
            );
        if (rareMineralsQty > 0)
            newTradeGoods = addTradeGood(
                newTradeGoods,
                "rare_minerals",
                rareMineralsQty,
            );

        const newResources = { ...s.research.resources };
        if (ancientData > 0)
            newResources.ancient_data =
                (newResources.ancient_data ?? 0) + ancientData;
        if (techSalvage > 0)
            newResources.tech_salvage =
                (newResources.tech_salvage ?? 0) + techSalvage;

        const newModuleRecipes = foundRecipe
            ? [...s.moduleRecipes, foundRecipe]
            : s.moduleRecipes;
        const newCrew =
            scoutDamage > 0
                ? s.crew.map((member) =>
                      member.id === scout.id
                          ? {
                                ...member,
                                health: Math.max(1, member.health - scoutDamage),
                            }
                          : member,
                  )
                : s.crew;
        const newModules =
            moduleDamage > 0 && damageTarget
                ? s.ship.modules.map((module) =>
                      module.id === damageTarget.id
                          ? {
                                ...module,
                                health: Math.max(
                                    0,
                                    module.health - moduleDamage,
                                ),
                            }
                          : module,
                  )
                : s.ship.modules;

        return {
            turn: s.turn + 1,
            ship: {
                ...s.ship,
                modules: newModules,
                tradeGoods: newTradeGoods,
            },
            crew: newCrew,
            research: { ...s.research, resources: newResources },
            moduleRecipes: newModuleRecipes,
            ...patchLocation(s, locationId, {
                derelictExplored: true,
                derelictLoot: lootResult,
            }),
        };
    });

    handleDerelictRecoveryContracts(locationId, set, get);

    // Лог-сообщения
    const lootParts: string[] = [];
    if (sparesQty > 0)
        lootParts.push(
            `${i18nStore.t("derelict_ship.loot_spares")} ×${sparesQty}`,
        );
    if (electronicsQty > 0)
        lootParts.push(
            `${i18nStore.t("derelict_ship.loot_electronics")} ×${electronicsQty}`,
        );
    if (rareMineralsQty > 0)
        lootParts.push(
            `${i18nStore.t("derelict_ship.loot_rare_minerals")} ×${rareMineralsQty}`,
        );
    if (ancientData > 0)
        lootParts.push(
            `${i18nStore.t("derelict_ship.loot_ancient_data")} ×${ancientData}`,
        );
    if (techSalvage > 0)
        lootParts.push(
            `${i18nStore.t("derelict_ship.loot_tech_salvage")} ×${techSalvage}`,
        );

    if (lootParts.length > 0) {
        get().addLog( i18nStore.t("game_logs.exploreDerelictShip_4", { scout_name: scout.name, value: lootParts.join(", ") }),
            "info",
        );
    } else {
        get().addLog( i18nStore.t("game_logs.exploreDerelictShip_5", { scout_name: scout.name }),
            "info",
        );
    }

    if (foundRecipe) {
        const recipe = MODULE_RECIPES[foundRecipe];
        get().addLog( i18nStore.t("game_logs.exploreDerelictShip_6", { icon: recipe.icon, recipe_name: recipe.name }),
            "info",
        );
    }

    if (scoutDamage > 0) {
        get().addLog(
            i18nStore.t("game_logs.exploreDerelictShip_scout_damage", {
                scout_name: scout.name,
                damage: scoutDamage,
            }),
            "warning",
        );
    }
    if (moduleDamage > 0 && damageTarget) {
        get().addLog(
            i18nStore.t("game_logs.exploreDerelictShip_module_damage", {
                module_name: damageTarget.name,
                damage: moduleDamage,
            }),
            "warning",
        );
    }

    get().updateShipStats();
};

/**
 * Возвращает случайный рецепт, которого у игрока ещё нет.
 */
const pickUncollectedRecipe = (
    owned: ModuleRecipeId[],
): ModuleRecipeId | null => {
    const available = ALL_RECIPE_IDS.filter((id) => !owned.includes(id));
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
};
