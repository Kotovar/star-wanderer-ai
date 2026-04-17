import type { SetState, GameStore, PlanetType } from "@/game/types";
import type { ResearchResourceType } from "@/game/types/research";
import { RESEARCH_RESOURCES } from "@/game/constants";
import { SCIENTIST_ATMOSPHERE_EXP } from "@/game/constants/experience";
import { addTradeGood } from "@/game/slices/ship/helpers";

type ResourceYield = { type: ResearchResourceType; qty: number };

/**
 * Определяет исследовательские ресурсы по типу атмосферы планеты
 */
const getAtmosphereResources = (
    planetType: PlanetType | undefined,
): ResourceYield[] => {
    const r = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    switch (planetType) {
        case "Ледяная":
        case "Арктическая":
            return [
                { type: "rare_minerals", qty: r(2, 4) },
                { type: "quantum_crystals", qty: 1 },
            ];

        case "Вулканическая":
        case "Приливная":
            return [{ type: "energy_samples", qty: r(3, 5) }];

        case "Лесная":
        case "Тропическая":
            return [{ type: "alien_biology", qty: r(3, 5) }];

        case "Океаническая":
            return [
                { type: "alien_biology", qty: r(2, 3) },
                { type: "energy_samples", qty: r(1, 2) },
            ];

        case "Кристаллическая":
            return [
                { type: "quantum_crystals", qty: 1 },
                { type: "rare_minerals", qty: r(2, 4) },
            ];

        case "Пустынная":
        case "Планета-кольцо":
            return [{ type: "rare_minerals", qty: r(3, 5) }];

        case "Радиоактивная":
            return [
                { type: "energy_samples", qty: r(2, 3) },
                { type: "quantum_crystals", qty: 1 },
            ];

        case "Разрушенная войной":
            return [{ type: "ancient_data", qty: r(2, 4) }];

        default:
            return [
                { type: "rare_minerals", qty: r(2, 3) },
                { type: "tech_salvage", qty: r(1, 2) },
            ];
    }
};

/**
 * Атмосферный анализ — однократный сбор исследовательских ресурсов учёным.
 * Требует: технологию atmospheric_analysis + учёного в экипаже.
 */
export const atmosphericAnalysis = (
    planetId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    // Проверка технологии
    if (!state.research.researchedTechs.includes("atmospheric_analysis")) {
        get().addLog("Требуется технология: Атмосферный анализ", "error");
        return;
    }

    // Проверка учёного
    const scientist = state.crew.find((c) => c.profession === "scientist");
    if (!scientist) {
        get().addLog("Требуется учёный в экипаже!", "error");
        return;
    }

    // Проверка уже проанализировано
    const planet = state.currentSector?.locations.find((l) => l.id === planetId);
    if (planet?.atmosphereAnalyzed) {
        get().addLog("Атмосфера этой планеты уже была проанализирована.", "error");
        return;
    }

    const resources = getAtmosphereResources(planet?.planetType);

    // Применяем ресурсы: rare_minerals → трюм (торговый ресурс), остальные → исследования
    const cargoCapacity = get().getCargoCapacity();

    set((s) => {
        const updated = { ...s.research.resources };
        const cargoUsed =
            s.ship.cargo.reduce((sum, c) => sum + c.quantity, 0) +
            s.ship.tradeGoods.reduce((sum, g) => sum + g.quantity, 0);
        let availableSpace = Math.max(0, cargoCapacity - cargoUsed);
        let newTradeGoods = [...s.ship.tradeGoods];

        for (const res of resources) {
            if (res.type === "rare_minerals") {
                const actual = Math.min(res.qty, availableSpace);
                if (actual > 0) {
                    newTradeGoods = addTradeGood(newTradeGoods, "rare_minerals", actual);
                    availableSpace -= actual;
                }
            } else {
                updated[res.type] = (updated[res.type] || 0) + res.qty;
            }
        }
        return {
            ship: { ...s.ship, tradeGoods: newTradeGoods },
            research: { ...s.research, resources: updated },
        };
    });

    resources.forEach((res) => {
        const rd = RESEARCH_RESOURCES[res.type];
        const destination = res.type === "rare_minerals" ? " → трюм" : "";
        get().addLog(
            `🌫️ Атмосферный анализ: ${rd?.icon ?? ""} ${rd?.name ?? res.type} x${res.qty}${destination}`,
            "info",
        );
    });

    // Опыт учёному
    get().gainExp(scientist, SCIENTIST_ATMOSPHERE_EXP);

    // Формируем результат для отображения в UI
    const atmoResult = {
        researchResources: resources.map((res) => ({
            type: res.type,
            quantity: res.qty,
        })),
    };

    // Помечаем как проанализированную, продвигаем ход
    set((s) => ({
        turn: s.turn + 1,
        currentSector: s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map((l) =>
                      l.id === planetId
                          ? { ...l, atmosphereAnalyzed: true, lastAtmosphericResult: atmoResult }
                          : l,
                  ),
              }
            : s.currentSector,
        currentLocation:
            s.currentLocation?.id === planetId
                ? { ...s.currentLocation, atmosphereAnalyzed: true, lastAtmosphericResult: atmoResult }
                : s.currentLocation,
    }));

    get().updateShipStats();
};
