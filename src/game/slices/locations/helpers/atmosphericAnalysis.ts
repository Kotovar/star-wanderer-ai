import { store as i18nStore } from "@/lib/useTranslation";
import type { SetState, GameStore, PlanetType } from "@/game/types";
import type { ResearchResourceType } from "@/game/types/research";
import { RESEARCH_RESOURCES } from "@/game/constants";
import { SCIENTIST_ATMOSPHERE_EXP } from "@/game/constants/experience";
import {
    addTradeGoodWithinCapacity,
    getFreeCargoSpace,
} from "@/game/slices/ship/helpers";
import { getBestByProfession } from "@/game/crew";
import { getLivingShipCrew } from "@/game/crew/stationed";
import { appendSurfaceLog } from "./sendScoutingMission";
import { planetHasFeature } from "@/game/planets";
import { patchLocation } from "@/game/utils/patchLocation";

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
        get().addLog( i18nStore.t("game_logs.atmosphericAnalysis_1"), "error");
        return;
    }

    // Проверка учёного
    const scientist = getBestByProfession(
        getLivingShipCrew(state.crew),
        "scientist",
    );
    if (!scientist) {
        get().addLog( i18nStore.t("game_logs.atmosphericAnalysis_2"), "error");
        return;
    }

    // Проверка уже проанализировано
    const planet = state.currentSector?.locations.find((l) => l.id === planetId);
    if (planet?.atmosphereAnalyzed) {
        get().addLog( i18nStore.t("game_logs.atmosphericAnalysis_3"), "error");
        return;
    }

    const resources = getAtmosphereResources(planet?.planetType);

    // Плотная ионосфера насыщена частицами: +1 к каждому ресурсу
    if (planetHasFeature(planetId, "dense_ionosphere")) {
        for (const res of resources) res.qty += 1;
    }

    // Применяем ресурсы: rare_minerals → трюм (торговый ресурс), остальные → исследования
    const rareMinerals = resources.find((res) => res.type === "rare_minerals");
    const cargoResult = rareMinerals
        ? addTradeGoodWithinCapacity(
              state.ship.tradeGoods,
              "rare_minerals",
              rareMinerals.qty,
              getFreeCargoSpace(state),
          )
        : null;
    const receivedResources = resources.flatMap((res) =>
        res.type !== "rare_minerals"
            ? [res]
            : cargoResult && cargoResult.accepted > 0
              ? [{ ...res, qty: cargoResult.accepted }]
              : [],
    );

    set((s) => {
        const updated = { ...s.research.resources };

        for (const res of resources) {
            if (res.type !== "rare_minerals") {
                updated[res.type] = (updated[res.type] || 0) + res.qty;
            }
        }
        return {
            ship: { ...s.ship, tradeGoods: cargoResult?.tradeGoods ?? s.ship.tradeGoods },
            research: { ...s.research, resources: updated },
        };
    });

    receivedResources.forEach((res) => {
        const rd = RESEARCH_RESOURCES[res.type];
        const destination = res.type === "rare_minerals" ? " → трюм" : "";
        get().addLog( i18nStore.t("game_logs.atmosphericAnalysis_4", { value: rd?.icon ?? "", type: rd?.name ?? res.type, qty: res.qty, destination }),
            "info",
        );
    });
    if (cargoResult?.discarded) {
        get().addLog( i18nStore.t("game_logs.cargo_overflow", { discarded: cargoResult.discarded }), "warning");
    }

    // Опыт учёному
    get().gainExp(scientist, SCIENTIST_ATMOSPHERE_EXP);

    // Формируем результат для отображения в UI
    const atmoResult = {
        researchResources: receivedResources.map((res) => ({
            type: res.type,
            quantity: res.qty,
        })),
    };

    const logEntry = {
        source: "analysis" as const,
        researchResources: atmoResult.researchResources,
    };

    // Помечаем как проанализированную, продвигаем ход
    set((s) => ({
        turn: s.turn + 1,
        ...patchLocation(s, planetId, (loc) => ({
            atmosphereAnalyzed: true,
            lastAtmosphericResult: atmoResult,
            surfaceLog: appendSurfaceLog(loc.surfaceLog, logEntry),
        })),
    }));

    get().updateShipStats();
};
