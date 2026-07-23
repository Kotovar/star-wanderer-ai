import { toast } from "sonner";
import { store as i18nStore } from "@/lib/useTranslation";
import type { SetState, GameStore, WreckApproach } from "@/game/types";
import { patchLocation } from "@/game/utils/patchLocation";
import { LAB_MODULE_TYPES } from "@/game/constants/modules";
import {
    getWreckScannerRareChanceMultiplier,
    getWreckSpecialLootChance,
    WRECK_APPROACH_CONFIG,
    WRECK_LAB_ANCIENT_DATA_MULTIPLIER,
} from "@/game/slices/locations/constants";
import { isModuleActive } from "@/game/modules/utils";
import { getEffectiveScanRange } from "@/game/slices/scanner/helpers/getEffectiveScanRange";
import {
    addTradeGood,
    getCargoCapacity,
    getCurrentCargo,
} from "@/game/slices/ship/helpers";

// Лут по тирам: [min, max]
const LOOT_BY_TIER = {
    1: { spares: [1, 4], electronics: [0, 2], rare_minerals: [0, 1], tech_salvage: 0.1,  ancient_data: 0,    shieldDmg: [5,  15] },
    2: { spares: [2, 6], electronics: [1, 3], rare_minerals: [1, 2], tech_salvage: 0.3,  ancient_data: 0,    shieldDmg: [10, 25] },
    3: { spares: [3, 8], electronics: [2, 4], rare_minerals: [1, 3], tech_salvage: 0.6,  ancient_data: 0.15, shieldDmg: [15, 35] },
} as const;

const MIN_MODULE_HEALTH = 5;
const CREW_MIN_HEALTH = 1;

const rng = (min: number, max: number) =>
    min + Math.floor(Math.random() * (max - min + 1));

/**
 * Один проход по полю обломков с выбранным уровнем риска.
 * - Если щитов не хватает — радиационный overflow бьёт по случайному модулю.
 * - Тир 3: если есть overflow — лёгкий урон радиацией по всему экипажу.
 * - Активный сканер усиливает ценные находки при глубоком вскрытии.
 * - Активная лаборатория удваивает найденные данные Древних.
 * - Лут ограничен свободным местом в трюме.
 * После последнего прохода поле помечается как истощённое.
 */
export function salvageWreckField(
    set: SetState,
    get: () => GameStore,
    approach: WreckApproach = "standard",
): void {
    const state = get();
    const loc = state.currentLocation;

    if (!loc || loc.type !== "wreck_field") return;
    if (loc.wreckExhausted) {
        get().addLog( i18nStore.t("game_logs.salvageWreckField_1"), "warning");
        return;
    }

    const tier = (loc.wreckTier ?? 1) as 1 | 2 | 3;
    const config = LOOT_BY_TIER[tier];
    const approachConfig = WRECK_APPROACH_CONFIG[approach];
    const hasActiveScanner = state.ship.modules.some(
        (module) =>
            isModuleActive(module) &&
            (module.type === "scanner" || module.type === "deep_survey_array"),
    );
    const scannerRareChanceMultiplier =
        approach === "deep" && hasActiveScanner
            ? getWreckScannerRareChanceMultiplier(getEffectiveScanRange(state))
            : 1;
    const hasActiveLab = state.ship.modules.some(
        (module) =>
            isModuleActive(module) && LAB_MODULE_TYPES.includes(module.type),
    );
    const passesTotal = loc.wreckPassesTotal ?? 2;
    const passesDone = loc.wreckPassesDone ?? 0;

    // — Урон по щитам / overflow —
    const shieldDmg   = Math.max(1, Math.round(
        rng(config.shieldDmg[0], config.shieldDmg[1]) * approachConfig.damageMult,
    ));
    const curShields   = state.ship.shields;
    const overflow     = Math.max(0, shieldDmg - curShields);
    const newShields   = Math.max(0, curShields - shieldDmg);

    // — Урон случайному модулю (если радиация прошла сквозь щиты) —
    let moduleDamageAmt = 0;
    let damagedModuleName: string | null = null;
    const modulesToDamage = state.ship.modules.filter((m) => m.health > 0);
    if (overflow > 0 && modulesToDamage.length > 0) {
        moduleDamageAmt = Math.max(1, Math.ceil(overflow / 2));
    }

    // — Урон экипажу от радиации (тир 3 + overflow) —
    let crewRadDamage = 0;
    if (tier === 3 && overflow > 0 && !approachConfig.crewProtected) {
        crewRadDamage = Math.max(1, Math.floor(overflow * 0.2));
    }

    // — Лут: базовые значения —
    const sparesRaw        = Math.round(rng(config.spares[0], config.spares[1]) * approachConfig.rewardMult);
    const electronicsRaw   = Math.round(rng(config.electronics[0], config.electronics[1]) * approachConfig.rewardMult);
    const rareMineralsRaw  = Math.round(rng(config.rare_minerals[0], config.rare_minerals[1]) * approachConfig.rewardMult);
    const techSalvage      = Math.random() < getWreckSpecialLootChance(
        config.tech_salvage,
        approachConfig.rareChanceMult,
        scannerRareChanceMultiplier,
    ) ? 1 : 0;
    const ancientDataFound = Math.random() < getWreckSpecialLootChance(
        config.ancient_data,
        approachConfig.rareChanceMult,
        scannerRareChanceMultiplier,
    );
    const ancientData = ancientDataFound
        ? hasActiveLab ? WRECK_LAB_ANCIENT_DATA_MULTIPLIER : 1
        : 0;

    // — Ограничение по трюму —
    const capacity = getCargoCapacity(state);
    const usedCargo = getCurrentCargo(state);
    let available  = Math.max(0, capacity - usedCargo);

    const spares = Math.min(sparesRaw, available);
    available -= spares;
    const electronics = Math.min(electronicsRaw, available);
    available -= electronics;
    const rareMinerals = Math.min(rareMineralsRaw, available);

    const cargoTrimmed =
        spares < sparesRaw ||
        electronics < electronicsRaw ||
        rareMinerals < rareMineralsRaw;

    const newPassesDone = passesDone + 1;
    const nowExhausted  = newPassesDone >= passesTotal;

    const lootResult = {
        approach,
        spares:        spares        > 0 ? spares        : undefined,
        electronics:   electronics   > 0 ? electronics   : undefined,
        rare_minerals: rareMinerals  > 0 ? rareMinerals  : undefined,
        tech_salvage:  techSalvage   > 0 ? techSalvage   : undefined,
        ancient_data:  ancientData   > 0 ? ancientData   : undefined,
        shieldDamage:  shieldDmg,
    };

    set((s) => {
        // — Cargo / trade goods —
        let newTradeGoods = s.ship.tradeGoods;
        if (spares > 0)
            newTradeGoods = addTradeGood(newTradeGoods, "spares", spares);
        if (electronics > 0)
            newTradeGoods = addTradeGood(newTradeGoods, "electronics", electronics);
        if (rareMinerals > 0)
            newTradeGoods = addTradeGood(newTradeGoods, "rare_minerals", rareMinerals);

        // — Research resources —
        const newResources = { ...s.research.resources };
        if (techSalvage > 0)
            newResources.tech_salvage = (newResources.tech_salvage ?? 0) + techSalvage;
        if (ancientData > 0)
            newResources.ancient_data = (newResources.ancient_data ?? 0) + ancientData;

        // — Module damage from radiation overflow —
        let newModules = s.ship.modules;
        if (moduleDamageAmt > 0) {
            const candidates = newModules
                .map((m, i) => ({ m, i }))
                .filter(({ m }) => m.health > 0);
            if (candidates.length > 0) {
                const { m, i } = candidates[Math.floor(Math.random() * candidates.length)];
                damagedModuleName = m.name;
                newModules = [...newModules];
                newModules[i] = {
                    ...m,
                    health: Math.max(MIN_MODULE_HEALTH, m.health - moduleDamageAmt),
                };
            }
        }

        // — Crew radiation damage (tier 3) —
        const newCrew = crewRadDamage > 0
            ? s.crew.map((c) => ({
                  ...c,
                  health: Math.max(CREW_MIN_HEALTH, c.health - crewRadDamage),
              }))
            : s.crew;

        return {
            turn: s.turn + 1,
            ship: {
                ...s.ship,
                shields: newShields,
                modules: newModules,
                tradeGoods: newTradeGoods,
            },
            crew: newCrew,
            research: { ...s.research, resources: newResources },
            ...patchLocation(s, loc.id, {
                wreckPassesDone: newPassesDone,
                wreckExhausted: nowExhausted,
                wreckLastPassLoot: lootResult,
            }),
        };
    });

    // — Log —
    const parts: string[] = [];
    if (spares      > 0) parts.push(`Запчасти ×${spares}`);
    if (electronics > 0) parts.push(`Электроника ×${electronics}`);
    if (rareMinerals > 0) parts.push(`Редкие минералы ×${rareMinerals}`);
    if (techSalvage > 0) parts.push(`⚙️ Техн. металлолом ×${techSalvage}`);
    if (ancientData > 0) parts.push(`📡 Древние данные ×${ancientData}`);

    const lootStr = parts.length > 0 ? parts.join(", ") : "ничего ценного";
    get().addLog( i18nStore.t("game_logs.salvageWreckField_2", { newPassesDone, passesTotal, lootStr, shieldDmg }),
        shieldDmg > 20 ? "warning" : "info",
    );

    if (cargoTrimmed) {
        const cargoFullMsg = i18nStore.t("game_logs.salvageWreckField_3");
        get().addLog(cargoFullMsg, "warning");
        toast(cargoFullMsg);
    }
    if (moduleDamageAmt > 0 && damagedModuleName) {
        get().addLog( i18nStore.t("game_logs.salvageWreckField_4", { damagedModuleName, moduleDamageAmt }),
            "warning",
        );
    }
    if (crewRadDamage > 0) {
        get().addLog( i18nStore.t("game_logs.salvageWreckField_5", { crewRadDamage }),
            "warning",
        );
    }
    if (nowExhausted) {
        get().addLog( i18nStore.t("game_logs.salvageWreckField_6"), "warning");
    }

    get().updateShipStats();
}
