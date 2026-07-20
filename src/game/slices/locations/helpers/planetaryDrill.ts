import type { SetState, GameStore, PlanetType } from "@/game/types";
import type { ResearchResourceType } from "@/game/types/research";
import type { Goods } from "@/game/types/goods";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import { addTradeGood } from "@/game/slices/ship/helpers";
import { ENGINEER_DRILL_EXP } from "@/game/constants/experience";
import { appendSurfaceLog } from "./sendScoutingMission";
import { planetHasFeature } from "@/game/planets";
import { patchLocation } from "@/game/utils/patchLocation";

/** Кол-во проходов бурения (богатые залежи дают +1) */
const DRILL_MAX_PASSES = 2;
/** Ходов между проходами бурения */
export const DRILL_COOLDOWN_TURNS = 6;
/** Множитель добычи на каждый следующий проход */
const PASS_YIELD_MULTIPLIERS = [1, 0.6, 0.4];

export const getDrillMaxPasses = (planetId: string): number =>
    DRILL_MAX_PASSES + (planetHasFeature(planetId, "rich_deposits") ? 1 : 0);

export const getDrillsDone = (planet: {
    drillsDone?: number;
    planetaryDrilled?: boolean;
}): number => planet.drillsDone ?? (planet.planetaryDrilled ? 1 : 0);

interface DrillYield {
    tradeGood?: { id: Goods; qty: number };
    researchResources: { type: ResearchResourceType; qty: number }[];
}

/**
 * Определяет добычу по типу планеты.
 * Количество ресурсов немного рандомизировано.
 */
const getDrillYield = (planetType: PlanetType | undefined): DrillYield => {
    const r = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    switch (planetType) {
        case "Ледяная":
        case "Арктическая":
            return {
                tradeGood: { id: "water", qty: r(3, 6) },
                researchResources: [{ type: "rare_minerals", qty: r(2, 4) }],
            };

        case "Вулканическая":
        case "Приливная":
            return {
                tradeGood: { id: "minerals", qty: r(3, 5) },
                researchResources: [{ type: "energy_samples", qty: r(2, 4) }],
            };

        case "Лесная":
        case "Тропическая":
            return {
                tradeGood: { id: "food", qty: r(3, 6) },
                researchResources: [{ type: "alien_biology", qty: r(2, 4) }],
            };

        case "Океаническая":
            return {
                tradeGood: { id: "water", qty: r(4, 7) },
                researchResources: [{ type: "alien_biology", qty: r(2, 3) }],
            };

        case "Кристаллическая":
            return {
                tradeGood: { id: "rare_minerals", qty: r(1, 3) },
                researchResources: [
                    { type: "quantum_crystals", qty: 1 },
                    { type: "rare_minerals", qty: r(2, 4) },
                ],
            };

        case "Пустынная":
            return {
                tradeGood: { id: "minerals", qty: r(2, 4) },
                researchResources: [{ type: "rare_minerals", qty: r(2, 4) }],
            };

        case "Планета-кольцо":
            return {
                tradeGood: { id: "rare_minerals", qty: r(1, 3) },
                researchResources: [
                    { type: "rare_minerals", qty: r(2, 3) },
                    { type: "quantum_crystals", qty: 1 },
                ],
            };

        case "Радиоактивная":
            return {
                researchResources: [
                    { type: "energy_samples", qty: r(3, 5) },
                    { type: "tech_salvage", qty: r(2, 4) },
                ],
            };

        case "Разрушенная войной":
            return {
                researchResources: [
                    { type: "ancient_data", qty: r(2, 4) },
                    { type: "rare_minerals", qty: r(1, 3) },
                ],
            };

        default:
            return {
                tradeGood: { id: "minerals", qty: r(2, 4) },
                researchResources: [{ type: "tech_salvage", qty: r(2, 3) }],
            };
    }
};

/**
 * Планетарное бурение — однократная добыча с поверхности пустой планеты.
 * Требует: технологию planetary_drill + модуль дрели.
 */
export const planetaryDrill = (
    planetId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    // Проверка технологии
    if (!state.research.researchedTechs.includes("planetary_drill")) {
        get().addLog("Требуется технология: Планетарный бур", "error");
        return;
    }

    // Проверка модуля дрели
    const hasDrill = state.ship.modules.some(
        (m) => m.type === "drill" && m.health > 0 && !m.disabled && !m.manualDisabled,
    );
    if (!hasDrill) {
        get().addLog("Требуется активный модуль дрели!", "error");
        return;
    }

    // Проверка проходов и кулдауна
    const planet = state.currentSector?.locations.find((l) => l.id === planetId);
    if (!planet) return;
    const drillsDone = getDrillsDone(planet);
    const maxPasses = getDrillMaxPasses(planetId);
    if (drillsDone >= maxPasses) {
        get().addLog("Залежи этой планеты истощены.", "error");
        return;
    }
    if (
        planet.lastDrillTurn !== undefined &&
        state.turn - planet.lastDrillTurn < DRILL_COOLDOWN_TURNS
    ) {
        get().addLog(
            `Бур остывает: следующий проход через ${DRILL_COOLDOWN_TURNS - (state.turn - planet.lastDrillTurn)} ход(ов).`,
            "warning",
        );
        return;
    }

    const planetType = planet?.planetType;
    const yields = getDrillYield(planetType);

    // Каждый следующий проход беднее; богатые залежи удваивают добычу
    const passMultiplier =
        (PASS_YIELD_MULTIPLIERS[drillsDone] ?? 0.4) *
        (planetHasFeature(planetId, "rich_deposits") ? 2 : 1);
    if (yields.tradeGood) {
        yields.tradeGood.qty = Math.max(
            1,
            Math.round(yields.tradeGood.qty * passMultiplier),
        );
    }
    for (const res of yields.researchResources) {
        res.qty = Math.max(1, Math.round(res.qty * passMultiplier));
    }

    // Применяем торговый товар
    if (yields.tradeGood) {
        const { id, qty } = yields.tradeGood;
        const goodName = TRADE_GOODS[id]?.name ?? id;
        set((s) => ({
            ship: {
                ...s.ship,
                tradeGoods: addTradeGood(s.ship.tradeGoods, id, qty),
            },
        }));
        get().addLog(`⛏️ Буровые работы: добыто ${goodName} x${qty}`, "info");
    }

    // Применяем исследовательские ресурсы
    if (yields.researchResources.length > 0) {
        set((s) => {
            const updated = { ...s.research.resources };
            for (const res of yields.researchResources) {
                updated[res.type] = (updated[res.type] || 0) + res.qty;
            }
            return { research: { ...s.research, resources: updated } };
        });
        yields.researchResources.forEach((res) => {
            const rd = RESEARCH_RESOURCES[res.type];
            get().addLog(
                `⛏️ Буровые работы: ${rd?.icon ?? ""} ${rd?.name ?? res.type} x${res.qty}`,
                "info",
            );
        });
    }

    // Опыт инженеру
    const engineer = state.crew.find((c) => c.profession === "engineer");
    if (engineer) {
        get().gainExp(engineer, ENGINEER_DRILL_EXP);
    }

    // Формируем результат для отображения в UI
    const drillResult = {
        tradeGood: yields.tradeGood
            ? {
                  name: TRADE_GOODS[yields.tradeGood.id]?.name ?? yields.tradeGood.id,
                  quantity: yields.tradeGood.qty,
              }
            : undefined,
        researchResources: yields.researchResources.map((res) => ({
            type: res.type,
            quantity: res.qty,
        })),
    };

    const logEntry = {
        source: "drill" as const,
        tradeGood: drillResult.tradeGood,
        researchResources: drillResult.researchResources,
    };

    // Засчитываем проход бурения, продвигаем ход
    const newDrillsDone = drillsDone + 1;
    const exhausted = newDrillsDone >= maxPasses;
    const drillPatch = {
        planetaryDrilled: exhausted, // legacy-флаг: залежи истощены
        drillsDone: newDrillsDone,
        lastDrillTurn: state.turn,
        lastDrillResult: drillResult,
    };
    set((s) => ({
        turn: s.turn + 1,
        ...patchLocation(s, planetId, (loc) => ({
            ...drillPatch,
            surfaceLog: appendSurfaceLog(loc.surfaceLog, logEntry),
        })),
    }));

    get().updateShipStats();
};
