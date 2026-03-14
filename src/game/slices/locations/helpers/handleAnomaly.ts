import type { SetState, GameStore, Location } from "@/game/types";
import { RESEARCH_RESOURCES } from "@/game/constants";
import { getAnomalyResources } from "@/game/research/utils";
import { getCrewByProfession } from "@/game/crew";
import { checkScientistLevel } from "./checkScientistLevel";
import { giveScientistsExp } from "./giveScientistsExp";
import { handleResearchContract } from "./handleResearchContract";
import { applyAnomalyEffect } from "./applyAnomalyEffect";

/**
 * Обрабатывает посещение аномалии
 *
 * @param anomaly - Объект аномалии
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const handleAnomaly = (
    anomaly: Location,
    set: SetState,
    get: () => GameStore,
): void => {
    const requiredLevel = anomaly.requiresScientistLevel ?? 1;
    const scientists = getCrewByProfession(get().crew, "scientist");

    // Check if scientists meet the level requirement
    const { canResearch } = checkScientistLevel(scientists, requiredLevel);
    if (!canResearch) {
        get().addLog(
            `Аномалия слишком сложна! Требуется учёный уровня ${requiredLevel}`,
            "error",
        );
        return;
    }

    // Mark location as completed
    set((s) => ({
        completedLocations: [...s.completedLocations, anomaly.id],
    }));

    // Get research resources from anomaly
    addResearchResources(set, get);

    // Give experience to scientists
    giveScientistsExp(scientists, requiredLevel, get().gainExp);

    // Handle research contracts
    handleResearchContracts(set, get);

    // Apply anomaly effect (reward or damage)
    applyAnomalyEffect(requiredLevel, anomaly.anomalyType || "good", set, get);

    // Update ship stats
    get().updateShipStats();
};

/**
 * Добавляет исследовательские ресурсы из аномалии
 */
const addResearchResources = (set: SetState, get: () => GameStore): void => {
    const anomalyResources = getAnomalyResources();

    if (anomalyResources.length === 0) return;

    set((s) => ({
        research: {
            ...s.research,
            resources: {
                ...s.research.resources,
                ...anomalyResources.reduce(
                    (acc, res) => ({
                        ...acc,
                        [res.type]:
                            (s.research.resources[res.type] || 0) +
                            res.quantity,
                    }),
                    {},
                ),
            },
        },
    }));

    anomalyResources.forEach((res) => {
        if (res.quantity > 0) {
            const resourceData = RESEARCH_RESOURCES[res.type];
            get().addLog(
                `🔬 Найдены исследовательские ресурсы: ${resourceData.icon} ${resourceData.name} x${res.quantity}`,
                "info",
            );
        }
    });
};

/**
 * Обрабатывает контракты на исследование
 */
const handleResearchContracts = (set: SetState, get: () => GameStore): void => {
    const researchContract = get().activeContracts.find(
        (c) => c.type === "research",
    );

    if (!researchContract) return;

    handleResearchContract(researchContract, set, get);
};
