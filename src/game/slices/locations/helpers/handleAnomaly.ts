import { store as i18nStore } from "@/lib/useTranslation";
import type { SetState, GameStore, Location, AnomalyApproach } from "@/game/types";
import { RESEARCH_RESOURCES } from "@/game/constants";
import { getAnomalyResources } from "@/game/research/utils";
import { getCrewByProfession } from "@/game/crew";
import { ANOMALY_APPROACH_CONFIG } from "../constants";
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
 * @param approach - Подход к исследованию (по умолчанию "standard")
 */
export const handleAnomaly = (
    anomaly: Location,
    set: SetState,
    get: () => GameStore,
    approach: AnomalyApproach = "standard",
): void => {
    const requiredLevel = anomaly.requiresScientistLevel ?? 1;
    const scientists = getCrewByProfession(get().crew, "scientist");

    // Check if scientists meet the level requirement
    const { canResearch } = checkScientistLevel(scientists, requiredLevel);
    if (!canResearch) {
        get().addLog( i18nStore.t("game_logs.handleAnomaly_1", { requiredLevel }),
            "error",
        );
        return;
    }

    const config = ANOMALY_APPROACH_CONFIG[approach];

    // Mark location as completed
    set((s) => ({
        completedLocations: [...s.completedLocations, anomaly.id],
    }));

    // Get research resources from anomaly
    addResearchResources(set, get, config.guaranteedResources);

    // Bonus resources if any scientist has "analyzing" assignment
    // Only standard and deep approaches benefit from analyzing scientists
    if (approach !== "cautious") {
        const analyzingScientists = scientists.filter(
            (s) => s.assignment === "analyzing",
        );
        if (analyzingScientists.length > 0) {
            addResearchResources(set, get, config.guaranteedResources);
            analyzingScientists.forEach((s) => {
                get().addLog( i18nStore.t("game_logs.handleAnomaly_2", { s_name: s.name }),
                    "info",
                );
            });
        }
    }

    // Give experience to scientists (scaled by approach)
    giveScientistsExp(scientists, requiredLevel, get().gainExp, config.expMult);

    // Handle research contracts
    handleResearchContracts(set, get);

    // Apply anomaly effect (reward or damage), scaled by approach
    applyAnomalyEffect(
        requiredLevel,
        anomaly.anomalyType || "good",
        approach,
        set,
        get,
    );

    // Update ship stats
    get().updateShipStats();
};

/**
 * Добавляет исследовательские ресурсы из аномалии
 */
const addResearchResources = (
    set: SetState,
    get: () => GameStore,
    guaranteed: boolean,
): void => {
    let anomalyResources = getAnomalyResources();

    // При глубоком погружении гарантируем хотя бы один ресурс
    if (guaranteed && anomalyResources.length === 0) {
        anomalyResources = [
            { type: "energy_samples", quantity: 1 },
        ];
    }

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
            get().addLog( i18nStore.t("game_logs.handleAnomaly_3", { icon: resourceData.icon, resourceData_name: resourceData.name, quantity: res.quantity }),
                "info",
            );
        }
    });
};

/**
 * Обрабатывает контракты на исследование
 */
const handleResearchContracts = (set: SetState, get: () => GameStore): void => {
    const researchContracts = get().activeContracts.filter(
        (c) => c.type === "research",
    );

    researchContracts.forEach((contract) => {
        handleResearchContract(contract, set, get);
    });
};
