import type { SetState, GameStore, PlanetType } from "@/game/types";
import type { ResearchResourceType } from "@/game/types/research";
import type { Goods } from "@/game/types/goods";
import { RESEARCH_RESOURCES, TRADE_GOODS } from "@/game/constants";
import { addTradeGood } from "@/game/slices/ship/helpers";
import { ENGINEER_DRILL_EXP } from "@/game/constants/experience";

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

    // Проверка уже пробурено
    const planet = state.currentSector?.locations.find((l) => l.id === planetId);
    if (planet?.planetaryDrilled) {
        get().addLog("Эта планета уже была пробурена.", "error");
        return;
    }

    const planetType = planet?.planetType;
    const yields = getDrillYield(planetType);

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

    // Помечаем планету как пробурённую, продвигаем ход
    set((s) => ({
        turn: s.turn + 1,
        currentSector: s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map((l) =>
                      l.id === planetId
                          ? { ...l, planetaryDrilled: true, lastDrillResult: drillResult }
                          : l,
                  ),
              }
            : s.currentSector,
        currentLocation:
            s.currentLocation?.id === planetId
                ? { ...s.currentLocation, planetaryDrilled: true, lastDrillResult: drillResult }
                : s.currentLocation,
    }));

    get().updateShipStats();
};
