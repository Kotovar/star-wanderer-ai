import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { isModuleActive } from "@/game/modules";
import { initialState } from "@/game/initial";
import { getAdjacentTechs } from "@/game/research/utils";
import {
    createLogSlice,
    createShipSlice,
    createScannerSlice,
    createCrewSlice,
    createGameLoopSlice,
    createGameManagementSlice,
    createSettingsSlice,
    createContractsSlice,
    createCombatSlice,
    createTravelSlice,
    createLocationsSlice,
    createUiSlice,
    createShopSlice,
    createServicesSlice,
    createTradeSlice,
    createCrewManagementSlice,
    createArtifactsSlice,
    createPlanetEffectsSlice,
} from "@/game/slices";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { playSound } from "@/sounds";
import { RESEARCH_TREE, RESEARCH_RESOURCES } from "@/game/constants";
import type { GameStore } from "@/game/types";

// Game store
export const useGameStore = create<GameStore>()(
    immer((set, get) => ({
        ...initialState,
        ...createLogSlice(set),
        ...createShipSlice(set, get),
        ...createScannerSlice(set, get),
        ...createCrewSlice(set, get),
        ...createGameLoopSlice(set, get),
        ...createGameManagementSlice(set, get),
        ...createSettingsSlice(set),
        ...createContractsSlice(set, get),
        ...createCombatSlice(set, get),
        ...createTravelSlice(set, get),
        ...createLocationsSlice(set, get),
        ...createUiSlice(set),
        ...createShopSlice(set, get),
        ...createServicesSlice(set, get),
        ...createTradeSlice(set, get),
        ...createCrewManagementSlice(set, get),
        ...createArtifactsSlice(set, get),
        ...createPlanetEffectsSlice(set, get),

        // ═══════════════════════════════════════════════════════════════
        // RESEARCH SYSTEM
        // ═══════════════════════════════════════════════════════════════

        startResearch: (techId: string) => {
            const state = get();
            const tech = RESEARCH_TREE[techId];
            if (!tech) return;

            // Check if already researched
            if (state.research.researchedTechs.includes(techId)) {
                get().addLog("Технология уже изучена!", "warning");
                return;
            }

            // Check if already researching - only 1 technology at a time
            if (state.research.activeResearch) {
                get().addLog(
                    `Уже идёт исследование: ${RESEARCH_TREE[state.research.activeResearch.techId].name}`,
                    "warning",
                );
                return;
            }

            // Check prerequisites
            const researchedTechs = state.research.researchedTechs;
            for (const prereq of tech.prerequisites) {
                if (!researchedTechs.includes(prereq)) {
                    get().addLog(
                        `Требуется технология: ${RESEARCH_TREE[prereq].name}`,
                        "error",
                    );
                    return;
                }
            }

            // Check resources (including trade goods for rare_minerals)
            for (const [resourceType, required] of Object.entries(
                tech.resources,
            )) {
                let available =
                    state.research.resources[
                        resourceType as keyof typeof state.research.resources
                    ] || 0;

                // Also check trade goods for rare_minerals
                if (resourceType === "rare_minerals") {
                    const tradeGood = state.ship.tradeGoods.find(
                        (tg) => tg.item === "rare_minerals",
                    );
                    if (tradeGood) {
                        available += tradeGood.quantity;
                    }
                }

                if (available < required) {
                    get().addLog(
                        `Недостаточно ресурса: ${RESEARCH_RESOURCES[resourceType as keyof typeof RESEARCH_RESOURCES].name} (нужно: ${required}, есть: ${available})`,
                        "error",
                    );
                    return;
                }
            }

            // Check credits
            if (state.credits < tech.credits) {
                get().addLog("Недостаточно кредитов", "error");
                return;
            }

            // Check lab and scientist
            const hasLab = state.ship.modules.some(
                (m) => isModuleActive(m) && m.type === "lab",
            );
            const hasScientist = state.crew.some(
                (c) => c.profession === "scientist",
            );

            if (!hasLab || !hasScientist) {
                get().addLog("Требуется лаборатория и учёный", "error");
                return;
            }

            // Deduct resources and credits
            const newResources = { ...state.research.resources };
            const newTradeGoods = [...state.ship.tradeGoods];

            for (const [resourceType, required] of Object.entries(
                tech.resources,
            )) {
                let remaining = required;

                // First deduct from research resources
                const currentResearchResource =
                    newResources[resourceType as keyof typeof newResources] ||
                    0;
                if (currentResearchResource > 0) {
                    const deductFromResearch = Math.min(
                        currentResearchResource,
                        remaining,
                    );
                    newResources[resourceType as keyof typeof newResources] =
                        currentResearchResource - deductFromResearch;
                    remaining -= deductFromResearch;
                }

                // Then deduct from trade goods (for rare_minerals)
                if (remaining > 0 && resourceType === "rare_minerals") {
                    const tradeGoodIdx = newTradeGoods.findIndex(
                        (tg) => tg.item === "rare_minerals",
                    );
                    if (tradeGoodIdx >= 0) {
                        const tradeGood = newTradeGoods[tradeGoodIdx];
                        const deductFromTrade = Math.min(
                            tradeGood.quantity,
                            remaining,
                        );
                        newTradeGoods[tradeGoodIdx] = {
                            ...tradeGood,
                            quantity: tradeGood.quantity - deductFromTrade,
                        };
                        // Remove if quantity is 0
                        if (newTradeGoods[tradeGoodIdx].quantity <= 0) {
                            newTradeGoods.splice(tradeGoodIdx, 1);
                        }
                        remaining -= deductFromTrade;
                    }
                }
            }

            // Calculate research output to determine turns remaining
            const labs = state.ship.modules.filter(
                (m) => m.type === "lab" && isModuleActive(m),
            );
            let researchOutput = labs.reduce(
                (sum, m) => sum + (m.researchOutput || 0),
                0,
            );

            // Add scientist bonus
            const scientists = state.crew.filter(
                (c) => c.profession === "scientist" && c.health > 0,
            );
            scientists.forEach((scientist) => {
                // Base scientist bonus: 5 points per turn
                researchOutput += 5;

                // Assignment bonus - "research" gives +100% (2x multiplier)
                if (scientist.assignment === "research") {
                    researchOutput = Math.floor(researchOutput * 2);
                }

                // Level bonus: +1 per level
                researchOutput += scientist.level || 1;
            });

            // Calculate initial turns remaining (100 points needed)
            const initialTurnsRemaining =
                researchOutput > 0 ? Math.ceil(100 / researchOutput) : 999;

            set({
                credits: state.credits - tech.credits,
                ship: {
                    ...state.ship,
                    tradeGoods: newTradeGoods,
                },
                research: {
                    ...state.research,
                    resources: newResources,
                    activeResearch: {
                        techId,
                        progress: 0,
                        turnsRemaining: initialTurnsRemaining,
                    },
                },
            });

            get().addLog(`🔬 Начато исследование: ${tech.name}`, "info");
            playSound("success");
        },

        addResearchResource: (type: string, quantity: number) => {
            set((state) => ({
                research: {
                    ...state.research,
                    resources: {
                        ...state.research.resources,
                        [type]:
                            (state.research.resources[
                                type as keyof typeof state.research.resources
                            ] || 0) + quantity,
                    },
                },
            }));
        },

        processResearch: () => {
            const state = get();
            if (!state.research.activeResearch) return;

            const tech = RESEARCH_TREE[state.research.activeResearch.techId];
            if (!tech) return;

            // Calculate research output from lab modules
            const labs = state.ship.modules.filter(
                (m) => m.type === "lab" && isModuleActive(m),
            );
            let researchOutput = labs.reduce(
                (sum, m) => sum + (m.researchOutput || 0),
                0,
            );

            // Add scientist bonus
            const scientists = state.crew.filter(
                (c) => c.profession === "scientist" && c.health > 0,
            );
            scientists.forEach((scientist) => {
                // Base scientist bonus: 5 points per turn
                researchOutput += 5;

                // Assignment bonus - "research" gives +100% (2x multiplier)
                if (scientist.assignment === "research") {
                    researchOutput = Math.floor(researchOutput * 2);
                }

                // Level bonus: +1 per level
                researchOutput += scientist.level || 1;
            });

            // Research speed bonus from technologies
            const hasResearchSpeedTech = state.research.researchedTechs.some(
                (techId) =>
                    RESEARCH_TREE[techId].bonuses.some(
                        (b) => b.type === "research_speed",
                    ),
            );
            if (hasResearchSpeedTech) {
                researchOutput = Math.floor(researchOutput * 1.2);
            }

            // Бонус от сращивания ксеноморфа с lab
            const mergeBonus = getMergeEffectsBonus(
                state.crew,
                state.ship.modules,
            );
            if (mergeBonus.researchSpeed) {
                researchOutput = Math.floor(
                    researchOutput * (1 + mergeBonus.researchSpeed / 100),
                );
            }

            // Calculate progress (base: 100 points needed)
            const progressGained = researchOutput;
            const newProgress = Math.min(
                100,
                state.research.activeResearch.progress + progressGained,
            );

            // Calculate turns remaining based on actual progress
            const progressNeeded = 100 - newProgress;
            const turnsRemaining =
                researchOutput > 0
                    ? Math.ceil(progressNeeded / researchOutput)
                    : 999;

            if (newProgress >= 100) {
                // Research complete!
                const completedTechId = state.research.activeResearch.techId;
                const completedTech = RESEARCH_TREE[completedTechId];

                // Apply technology bonuses
                let powerBonusApplied = false;
                let shieldBonusApplied = false;
                let weaponDamageBonusApplied = false;
                let scanRangeBonusApplied = false;
                let cargoCapacityBonusApplied = false;
                let crewHealthBonusApplied = false;
                let crewExpBonusApplied = false;

                completedTech.bonuses.forEach((bonus) => {
                    if (bonus.type === "module_health" && bonus.value > 0) {
                        // Apply health bonus to all modules
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) => {
                                    const newMaxHealth = Math.floor(
                                        (m.maxHealth || 100) *
                                            (1 + bonus.value),
                                    );
                                    // Set health to max (100% after upgrade)
                                    return {
                                        ...m,
                                        maxHealth: newMaxHealth,
                                        health: newMaxHealth,
                                    };
                                }),
                            },
                        }));
                    }

                    if (bonus.type === "module_power" && bonus.value > 0) {
                        // Apply power bonus to reactor modules
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) => {
                                    if (m.type === "reactor") {
                                        return {
                                            ...m,
                                            power: Math.floor(
                                                (m.power || 0) *
                                                    (1 + bonus.value),
                                            ),
                                        };
                                    }
                                    return m;
                                }),
                            },
                        }));
                        powerBonusApplied = true;
                    }

                    if (bonus.type === "shield_strength" && bonus.value > 0) {
                        // Apply shield strength bonus to shield modules
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) => {
                                    if (m.type === "shield") {
                                        return {
                                            ...m,
                                            defense: Math.floor(
                                                (m.defense || 0) *
                                                    (1 + bonus.value),
                                            ),
                                        };
                                    }
                                    return m;
                                }),
                            },
                        }));
                        shieldBonusApplied = true;
                    }

                    if (bonus.type === "weapon_damage" && bonus.value > 0) {
                        // Weapon damage bonus - tracked via researchedTechs
                        weaponDamageBonusApplied = true;
                    }

                    if (bonus.type === "scan_range" && bonus.value > 0) {
                        // Apply scan range bonus to scanner modules
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) => {
                                    if (m.type === "scanner") {
                                        return {
                                            ...m,
                                            scanRange: Math.floor(
                                                (m.scanRange || 0) *
                                                    (1 + bonus.value),
                                            ),
                                        };
                                    }
                                    return m;
                                }),
                            },
                        }));
                        scanRangeBonusApplied = true;
                    }

                    if (bonus.type === "cargo_capacity" && bonus.value > 0) {
                        // Apply cargo capacity bonus to all cargo modules
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) => {
                                    if (m.type === "cargo") {
                                        return {
                                            ...m,
                                            capacity: Math.floor(
                                                (m.capacity || 40) *
                                                    (1 + bonus.value),
                                            ),
                                        };
                                    }
                                    return m;
                                }),
                            },
                        }));
                        cargoCapacityBonusApplied = true;
                    }

                    if (bonus.type === "crew_health" && bonus.value > 0) {
                        // Apply crew health bonus to all crew members
                        set((s) => ({
                            crew: s.crew.map((c) => {
                                const newMaxHealth = Math.floor(
                                    (c.maxHealth || 100) * (1 + bonus.value),
                                );
                                return {
                                    ...c,
                                    maxHealth: newMaxHealth,
                                    health: Math.min(c.health, newMaxHealth),
                                };
                            }),
                        }));
                        crewHealthBonusApplied = true;
                    }

                    if (bonus.type === "crew_exp" && bonus.value > 0) {
                        // Crew exp bonus - tracked via researchedTechs and applied in gainExp
                        crewExpBonusApplied = true;
                    }
                });

                // Apply bonuses (for now just mark as researched, actual bonuses applied elsewhere)
                set((s) => ({
                    research: {
                        ...s.research,
                        researchedTechs: [
                            ...s.research.researchedTechs,
                            completedTechId,
                        ],
                        discoveredTechs: [
                            ...new Set([
                                ...s.research.discoveredTechs,
                                ...getAdjacentTechs(completedTechId),
                            ]),
                        ],
                        activeResearch: null,
                    },
                }));

                get().addLog(
                    `✅ Исследование завершено: ${completedTech.name}`,
                    "info",
                );
                get().addLog(
                    `Получены бонусы: ${completedTech.bonuses.map((b) => b.description).join(", ")}`,
                    "info",
                );

                if (powerBonusApplied) {
                    get().addLog(`⚡ Мощность реакторов увеличена`, "info");
                    get().updateShipStats();
                }

                if (shieldBonusApplied) {
                    get().addLog(`🔵 Мощность щитов увеличена`, "info");
                    get().updateShipStats();
                }

                if (weaponDamageBonusApplied) {
                    get().addLog(`🔴 Урон оружия увеличен`, "info");
                    get().updateShipStats();
                }

                if (scanRangeBonusApplied) {
                    get().addLog(`📡 Дальность сканирования увеличена`, "info");
                    get().updateShipStats();
                }

                if (cargoCapacityBonusApplied) {
                    get().addLog(`📦 Вместимость трюма увеличена`, "info");
                    get().updateShipStats();
                }

                if (crewHealthBonusApplied) {
                    get().addLog(`💉 Здоровье экипажа увеличено`, "info");
                }

                if (crewExpBonusApplied) {
                    get().addLog(`🎓 Опыт экипажа увеличен`, "info");
                }

                playSound("success");

                // Discover adjacent technologies
                const adjacent = getAdjacentTechs(completedTechId);
                adjacent.forEach((techId) => {
                    if (!state.research.discoveredTechs.includes(techId)) {
                        get().addLog(
                            `📖 Открыта технология: ${RESEARCH_TREE[techId].name}`,
                            "info",
                        );
                    }
                });
            } else {
                // Continue research
                set({
                    research: {
                        ...state.research,
                        activeResearch: {
                            ...state.research.activeResearch,
                            progress: newProgress,
                            turnsRemaining,
                        },
                    },
                });
            }
        },
    })),
);
