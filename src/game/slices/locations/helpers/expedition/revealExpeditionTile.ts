import { store as i18nStore } from "@/lib/useTranslation";
import type { SetState, GameStore } from "@/game/types";
import type { ExpeditionReward } from "@/game/types/exploration";
import { RESEARCH_RESOURCES } from "@/game/constants";
import { pickRuinsEvent } from "./ruinsEvents";
import { isTileReachable } from "./adjacency";
import {
    EXPEDITION_MARKET_CREDITS_MIN,
    EXPEDITION_MARKET_CREDITS_MAX,
    EXPEDITION_LAB_RESOURCE_MIN,
    EXPEDITION_LAB_RESOURCE_MAX,
    EXPEDITION_INCIDENT_DAMAGE_MIN,
    EXPEDITION_INCIDENT_DAMAGE_MAX,
    EXPEDITION_INCIDENT_MORALE_LOSS,
    EXPEDITION_GOOD_FIND_MORALE_BOOST,
    EXPEDITION_SCIENTIST_LAB_BONUS,
    EXPEDITION_GUNNER_DAMAGE_REDUCTION,
    EXPEDITION_MEDIC_MORALE_REDUCTION,
    EXPEDITION_PROFESSION_CAP,
    getExpeditionEnvironment,
} from "./constants";
import { RACES } from "@/game/constants/races";
import type { ResearchResourceType } from "@/game/types/research";
import type { RaceId } from "@/game/types";

const r = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

/** Научные ресурсы, предпочитаемые каждой расой */
const RACE_LAB_RESOURCE: Record<RaceId, ResearchResourceType> = {
    human: "tech_salvage",
    synthetic: "ancient_data",
    xenosymbiont: "alien_biology",
    krylorian: "rare_minerals",
    voidborn: "ancient_data",
    crystalline: "quantum_crystals",
};

const DEFAULT_LAB_RESOURCE: ResearchResourceType = "tech_salvage";

function getLabResource(raceId: RaceId | undefined): ResearchResourceType {
    if (!raceId || !(raceId in RACE_LAB_RESOURCE)) return DEFAULT_LAB_RESOURCE;
    return RACE_LAB_RESOURCE[raceId];
}

/**
 * Открывает тайл экспедиции и сразу применяет его эффект.
 * Исключение: тайл ruins — выставляет activeRuinsEvent и ждёт resolveRuinsChoice.
 */
export function revealExpeditionTile(
    tileIndex: number,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const expedition = state.activeExpedition;

    if (!expedition) return;
    if (expedition.finished) return;
    if (expedition.activeRuinsEvent !== null) return;
    const stepApCost = expedition.stepApCost ?? 1;
    if (expedition.apRemaining < stepApCost) return;

    const tile = expedition.grid[tileIndex];
    if (!tile || tile.revealed) return;
    // Пространственная сетка: открывать можно только смежные клетки
    if (!isTileReachable(expedition.grid, tileIndex)) return;

    // Состав отряда влияет на исходы тайлов
    const expCrew = state.crew.filter((c) =>
        expedition.crewIds.includes(c.id),
    );
    const professionCount = (p: string) =>
        expCrew.filter((c) => c.profession === p).length;
    const scientistCount = professionCount("scientist");
    const gunnerCount = professionCount("gunner");
    const medicCount = professionCount("medic");

    // Mark tile as revealed and spend AP
    const newGrid = expedition.grid.map((t, i) =>
        i === tileIndex ? { ...t, revealed: true } : t,
    );
    const newApRemaining = expedition.apRemaining - stepApCost;
    const newRevealedCount = expedition.revealedCount + 1;

    // Update grid/ap and track expedition_survey contract progress.
    // В контракт идут только значимые открытия: руины, лаборатории, артефакты
    const isSignificantDiscovery =
        tile.type === "ruins" || tile.type === "lab" || tile.type === "artifact";
    const expeditionPlanetId = expedition.planetId;
    // Контракты, которые ещё не были выполнены до этого вскрытия
    const notDoneBefore = new Set(
        state.activeContracts
            .filter(
                (c) =>
                    c.type === "expedition_survey" &&
                    c.targetPlanetId === expeditionPlanetId &&
                    !c.expeditionDone,
            )
            .map((c) => c.id),
    );
    set((s) => {
        const updatedContracts = s.activeContracts.map((c) => {
            if (
                isSignificantDiscovery &&
                c.type === "expedition_survey" &&
                c.targetPlanetId === expeditionPlanetId &&
                !c.expeditionDone
            ) {
                const newTiles = (c.tilesRevealed ?? 0) + 1;
                const done = newTiles >= (c.requiredDiscoveries ?? 1);
                return { ...c, tilesRevealed: newTiles, expeditionDone: done };
            }
            return c;
        });

        return {
            activeExpedition: s.activeExpedition
                ? {
                      ...s.activeExpedition,
                      grid: newGrid,
                      apRemaining: newApRemaining,
                      revealedCount: newRevealedCount,
                  }
                : null,
            activeContracts: updatedContracts,
        };
    });

    // Log when a contract just became fulfilled (ровно один раз)
    const justFulfilled = get().activeContracts.filter(
        (c) => notDoneBefore.has(c.id) && c.expeditionDone,
    );
    for (const c of justFulfilled) {
        get().addLog( i18nStore.t("game_logs.revealExpeditionTile_1", { tilesRevealed: c.tilesRevealed ?? 0, requiredDiscoveries: c.requiredDiscoveries ?? 0, sourceSectorName: c.sourceSectorName ?? "" }),
            "info",
        );
    }

    const planet = state.currentSector?.locations.find(
        (l) => l.id === expedition.planetId,
    );
    const raceId = planet?.dominantRace;
    const environment = getExpeditionEnvironment(planet?.planetType);

    const safeExpedition = expedition; // captured non-null reference for closures

    const stepDamage = environment?.stepDamage;
    if (stepDamage && expCrew.length > 0) {
        const target =
            expCrew[Math.floor(Math.random() * expCrew.length)];
        set((s) => ({
            crew: s.crew.map((c) =>
                c.id === target.id
                    ? {
                          ...c,
                          health: Math.max(0, c.health - stepDamage),
                      }
                    : c,
            ),
        }));
    }

    // Helper: boost morale for expedition crew on good finds
    function boostExpeditionMorale(amount: number) {
        set((s) => ({
            crew: s.crew.map((c) => {
                if (!safeExpedition.crewIds.includes(c.id)) return c;
                const race = RACES[c.race];
                if (race?.hasHappiness === false) return c;
                return {
                    ...c,
                    happiness: Math.min(c.maxHappiness, c.happiness + amount),
                };
            }),
        }));
    }

    // Apply tile effect
    switch (tile.type) {
        case "market": {
            const credits = r(
                EXPEDITION_MARKET_CREDITS_MIN,
                EXPEDITION_MARKET_CREDITS_MAX,
            );
            set((s) => ({
                activeExpedition: s.activeExpedition
                    ? {
                          ...s.activeExpedition,
                          rewards: {
                              ...s.activeExpedition.rewards,
                              credits:
                                  s.activeExpedition.rewards.credits + credits,
                          },
                      }
                    : null,
            }));
            boostExpeditionMorale(EXPEDITION_GOOD_FIND_MORALE_BOOST);
            get().addLog( i18nStore.t("game_logs.revealExpeditionTile_2", { credits }), "info");
            break;
        }

        case "lab": {
            const resType = getLabResource(raceId);
            // Учёные в отряде повышают выход ресурсов с лабораторий
            const qty =
                r(EXPEDITION_LAB_RESOURCE_MIN, EXPEDITION_LAB_RESOURCE_MAX) +
                scientistCount * EXPEDITION_SCIENTIST_LAB_BONUS;
            set((s) => {
                if (!s.activeExpedition) return {};
                const existing = s.activeExpedition.rewards.researchResources;
                const idx = existing.findIndex(
                    (reward) => reward.type === resType,
                );
                const updated =
                    idx >= 0
                        ? existing.map((reward, i) =>
                              i === idx
                                  ? {
                                        ...reward,
                                        quantity: reward.quantity + qty,
                                    }
                                  : reward,
                          )
                        : [...existing, { type: resType, quantity: qty }];
                return {
                    activeExpedition: {
                        ...s.activeExpedition,
                        rewards: {
                            ...s.activeExpedition.rewards,
                            researchResources: updated,
                        },
                    },
                };
            });
            const rd = RESEARCH_RESOURCES[resType];
            boostExpeditionMorale(EXPEDITION_GOOD_FIND_MORALE_BOOST);
            get().addLog( i18nStore.t("game_logs.revealExpeditionTile_3", { value: rd?.icon ?? "", resType: rd?.name ?? resType, qty }),
                "info",
            );
            break;
        }

        case "ruins": {
            const ruinsEvent = pickRuinsEvent();
            set((s) => ({
                activeExpedition: s.activeExpedition
                    ? {
                          ...s.activeExpedition,
                          activeRuinsEvent: ruinsEvent,
                          pendingTileIndex: tileIndex,
                      }
                    : null,
            }));
            // Do not log yet — player must make a choice
            break;
        }

        case "incident": {
            const baseDamage = r(
                EXPEDITION_INCIDENT_DAMAGE_MIN,
                EXPEDITION_INCIDENT_DAMAGE_MAX,
            );
            // Стрелки снижают урон от инцидентов, медики — потерю морали
            const damageReduction = Math.min(
                EXPEDITION_PROFESSION_CAP,
                gunnerCount * EXPEDITION_GUNNER_DAMAGE_REDUCTION,
            );
            const damage = Math.max(
                1,
                Math.round(baseDamage * (1 - damageReduction)),
            );
            const moraleReduction = Math.min(
                EXPEDITION_PROFESSION_CAP,
                medicCount * EXPEDITION_MEDIC_MORALE_REDUCTION,
            );
            const moraleLoss = Math.round(
                EXPEDITION_INCIDENT_MORALE_LOSS * (1 - moraleReduction),
            );
            const crewInExpedition = state.crew.filter((c) =>
                expedition.crewIds.includes(c.id),
            );
            if (crewInExpedition.length > 0) {
                const target =
                    crewInExpedition[
                        Math.floor(Math.random() * crewInExpedition.length)
                    ];
                set((s) => ({
                    crew: s.crew.map((c) => {
                        if (c.id !== target.id) return c;
                        const race = RACES[c.race];
                        const hasHappiness = race?.hasHappiness !== false;
                        return {
                            ...c,
                            health: Math.max(0, c.health - damage),
                            happiness: hasHappiness
                                ? Math.max(0, c.happiness - moraleLoss)
                                : c.happiness,
                        };
                    }),
                }));
                const mitigation =
                    damageReduction > 0 || moraleReduction > 0
                        ? ` (смягчено отрядом: −${Math.round(damageReduction * 100)}% урона, −${Math.round(moraleReduction * 100)}% морали)`
                        : "";
                get().addLog( i18nStore.t("game_logs.revealExpeditionTile_4", { target_name: target.name, damage, moraleLoss, mitigation }),
                    "error",
                );
            }
            break;
        }

        case "artifact": {
            const artifact = get().tryFindArtifact();
            if (artifact) {
                set((s) => ({
                    activeExpedition: s.activeExpedition
                        ? {
                              ...s.activeExpedition,
                              rewards: {
                                  ...s.activeExpedition.rewards,
                                  artifactFound: artifact.id,
                              },
                          }
                        : null,
                }));
                boostExpeditionMorale(EXPEDITION_GOOD_FIND_MORALE_BOOST * 2);
                get().addLog( i18nStore.t("game_logs.revealExpeditionTile_5", { artifact_name: artifact.name }), "info");
            } else {
                get().addLog( i18nStore.t("game_logs.revealExpeditionTile_6"), "info");
            }
            break;
        }
    }

    // Auto-end if AP ran out and no ruins pending
    const currentExpedition = get().activeExpedition;
    if (
        currentExpedition &&
        newApRemaining < stepApCost &&
        !currentExpedition.activeRuinsEvent &&
        !currentExpedition.finished
    ) {
        set((s) => ({
            activeExpedition: s.activeExpedition
                ? { ...s.activeExpedition, finished: true }
                : null,
        }));
    }
}

// Used internally when applying ruins choice trade goods
export function applyTradeGoodToExpedition(
    rewards: ExpeditionReward,
    goodId: string,
    qty: number,
): ExpeditionReward {
    const existing = rewards.tradeGoods.find((tg) => tg.id === goodId);
    const tradeGoods = existing
        ? rewards.tradeGoods.map((tg) =>
              tg.id === goodId ? { ...tg, quantity: tg.quantity + qty } : tg,
          )
        : [...rewards.tradeGoods, { id: goodId as never, quantity: qty }];
    return { ...rewards, tradeGoods };
}

export function applyResearchToExpedition(
    rewards: ExpeditionReward,
    resType: ResearchResourceType,
    qty: number,
): ExpeditionReward {
    const existing = rewards.researchResources.find(
        (reward) => reward.type === resType,
    );
    const researchResources = existing
        ? rewards.researchResources.map((reward) =>
              reward.type === resType
                  ? { ...reward, quantity: reward.quantity + qty }
                  : reward,
          )
        : [...rewards.researchResources, { type: resType, quantity: qty }];
    return { ...rewards, researchResources };
}
