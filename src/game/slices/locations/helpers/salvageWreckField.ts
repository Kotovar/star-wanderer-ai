import type { SetState, GameStore } from "@/game/types";
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
 * Один проход по полю обломков: собирает лут и получает урон по щитам от радиации.
 * - Если щитов не хватает — радиационный overflow бьёт по случайному модулю.
 * - Тир 3: если есть overflow — лёгкий урон радиацией по всему экипажу.
 * - Лут ограничен свободным местом в трюме.
 * После последнего прохода поле помечается как истощённое.
 */
export function salvageWreckField(set: SetState, get: () => GameStore): void {
    const state = get();
    const loc = state.currentLocation;

    if (!loc || loc.type !== "wreck_field") return;
    if (loc.wreckExhausted) {
        get().addLog("Поле обломков уже полностью обыскано.", "warning");
        return;
    }

    const tier = (loc.wreckTier ?? 1) as 1 | 2 | 3;
    const config = LOOT_BY_TIER[tier];
    const passesTotal = loc.wreckPassesTotal ?? 2;
    const passesDone = loc.wreckPassesDone ?? 0;

    // — Урон по щитам / overflow —
    const shieldDmg   = rng(config.shieldDmg[0], config.shieldDmg[1]);
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
    if (tier === 3 && overflow > 0) {
        crewRadDamage = Math.max(1, Math.floor(overflow * 0.2));
    }

    // — Лут: базовые значения —
    const sparesRaw        = rng(config.spares[0], config.spares[1]);
    const electronicsRaw   = rng(config.electronics[0], config.electronics[1]);
    const rareMineralsRaw  = rng(config.rare_minerals[0], config.rare_minerals[1]);
    const techSalvage      = Math.random() < config.tech_salvage ? 1 : 0;
    const ancientData      = Math.random() < config.ancient_data  ? 1 : 0;

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

        // — Update location in both currentLocation and sector —
        const patchLoc = (l: typeof loc) =>
            l.id === loc.id
                ? { ...l, wreckPassesDone: newPassesDone, wreckExhausted: nowExhausted, wreckLastPassLoot: lootResult }
                : l;

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
            currentLocation: s.currentLocation?.id === loc.id
                ? { ...s.currentLocation, wreckPassesDone: newPassesDone, wreckExhausted: nowExhausted, wreckLastPassLoot: lootResult }
                : s.currentLocation,
            currentSector: s.currentSector
                ? { ...s.currentSector, locations: s.currentSector.locations.map(patchLoc) }
                : null,
            galaxy: {
                ...s.galaxy,
                sectors: s.galaxy.sectors.map((sec) =>
                    sec.id === s.currentSector?.id
                        ? { ...sec, locations: sec.locations.map(patchLoc) }
                        : sec,
                ),
            },
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
    get().addLog(
        `🔧 Обыскано поле обломков (проход ${newPassesDone}/${passesTotal}): ${lootStr}. Щиты -${shieldDmg}.`,
        shieldDmg > 20 ? "warning" : "info",
    );

    if (cargoTrimmed) {
        get().addLog("⚠️ Трюм переполнен — часть находок не влезла.", "warning");
    }
    if (moduleDamageAmt > 0 && damagedModuleName) {
        get().addLog(
            `☢ Радиация пробила щиты! Модуль «${damagedModuleName}» повреждён на ${moduleDamageAmt}.`,
            "warning",
        );
    }
    if (crewRadDamage > 0) {
        get().addLog(
            `☢ Радиационный фон повредил экипаж (−${crewRadDamage} здоровья).`,
            "warning",
        );
    }
    if (nowExhausted) {
        get().addLog("💀 Поле обломков полностью обыскано. Радиация нарастает — пора уходить.", "warning");
    }

    get().updateShipStats();
}
