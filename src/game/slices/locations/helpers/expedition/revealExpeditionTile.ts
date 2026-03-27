import type { SetState, GameStore } from "@/game/types";
import type { ExpeditionReward } from "@/game/types/exploration";
import { RESEARCH_RESOURCES } from "@/game/constants";
import { pickRuinsEvent } from "./ruinsEvents";
import {
    EXPEDITION_MARKET_CREDITS_MIN,
    EXPEDITION_MARKET_CREDITS_MAX,
    EXPEDITION_LAB_RESOURCE_MIN,
    EXPEDITION_LAB_RESOURCE_MAX,
    EXPEDITION_INCIDENT_DAMAGE_MIN,
    EXPEDITION_INCIDENT_DAMAGE_MAX,
    EXPEDITION_INCIDENT_MORALE_LOSS,
    EXPEDITION_GOOD_FIND_MORALE_BOOST,
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
    if (expedition.apRemaining <= 0) return;
    if (expedition.activeRuinsEvent !== null) return;

    const tile = expedition.grid[tileIndex];
    if (!tile || tile.revealed) return;

    // Mark tile as revealed and spend AP
    const newGrid = expedition.grid.map((t, i) =>
        i === tileIndex ? { ...t, revealed: true } : t,
    );
    const newApRemaining = expedition.apRemaining - 1;
    const newRevealedCount = expedition.revealedCount + 1;

    // Update grid/ap and track expedition_survey contract progress
    const expeditionPlanetId = expedition.planetId;
    set((s) => {
        const updatedContracts = s.activeContracts.map((c) => {
            if (
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

    // Log when a contract just became fulfilled
    const justFulfilled = get().activeContracts.filter(
        (c) =>
            c.type === "expedition_survey" &&
            c.targetPlanetId === expeditionPlanetId &&
            c.expeditionDone &&
            (c.tilesRevealed ?? 0) === (c.requiredDiscoveries ?? 1),
    );
    for (const c of justFulfilled) {
        get().addLog(
            `📋 Данные собраны (${c.tilesRevealed}/${c.requiredDiscoveries} клеток). Вернитесь на ${c.sourceSectorName} для сдачи задания.`,
            "info",
        );
    }

    const planet = state.currentSector?.locations.find(
        (l) => l.id === expedition.planetId,
    );
    const raceId = planet?.dominantRace;

    const safeExpedition = expedition; // captured non-null reference for closures

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
            get().addLog(`🏪 Рынок: +${credits}₢`, "info");
            break;
        }

        case "lab": {
            const resType = getLabResource(raceId);
            const qty = r(
                EXPEDITION_LAB_RESOURCE_MIN,
                EXPEDITION_LAB_RESOURCE_MAX,
            );
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
            get().addLog(
                `🔬 Лаборатория: ${rd?.icon ?? ""} ${rd?.name ?? resType} x${qty}`,
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
            const damage = r(
                EXPEDITION_INCIDENT_DAMAGE_MIN,
                EXPEDITION_INCIDENT_DAMAGE_MAX,
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
                                ? Math.max(
                                      0,
                                      c.happiness -
                                          EXPEDITION_INCIDENT_MORALE_LOSS,
                                  )
                                : c.happiness,
                        };
                    }),
                }));
                get().addLog(
                    `⚠️ Инцидент! ${target.name} получил ${damage} урона и -${EXPEDITION_INCIDENT_MORALE_LOSS} морали.`,
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
                get().addLog(`✨ Найден артефакт: ${artifact.name}!`, "info");
            } else {
                get().addLog("🗿 Место оказалось пустым.", "info");
            }
            break;
        }

        case "exit": {
            set((s) => ({
                activeExpedition: s.activeExpedition
                    ? { ...s.activeExpedition, finished: true }
                    : null,
            }));
            get().addLog("🚪 Найден выход. Экспедиция завершается.", "info");
            break;
        }
    }

    // Auto-end if AP ran out and no ruins pending
    const currentExpedition = get().activeExpedition;
    if (
        currentExpedition &&
        newApRemaining <= 0 &&
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
