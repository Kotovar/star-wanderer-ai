import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
    getArtifactEffectValue,
    getRandomUndiscoveredArtifact,
} from "@/game/artifacts";
import { isModuleActive } from "@/game/modules";
import {
    PLANET_SPECIALIZATIONS,
    RACES,
    RESEARCH_TREE,
    RESEARCH_RESOURCES,
} from "@/game/constants";
import { generateGalaxy } from "@/game/galaxy";
import { initialState } from "@/game/initial";
import {
    clearLocalStorage,
    loadFromLocalStorage,
    saveToLocalStorage,
} from "@/game/saves/utils";
import { initializeStationData } from "@/game/stations";
import { getAdjacentTechs } from "@/game/research/utils";
import {
    createLogSlice,
    createShipSlice,
    createScannerSlice,
    createCrewSlice,
    createGameLoopSlice,
    createContractsSlice,
    createCombatSlice,
    createTravelSlice,
    createLocationsSlice,
    createUiSlice,
    createShopSlice,
    createServicesSlice,
    createTradeSlice,
    createCrewManagementSlice,
} from "@/game/slices";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import type { GameStore, RaceId } from "@/game/types";
import { playSound } from "@/sounds";

// Game store
export const useGameStore = create<GameStore>()(
    immer((set, get) => ({
        ...initialState,
        ...createLogSlice(set),
        ...createShipSlice(set, get),
        ...createScannerSlice(set, get),
        ...createCrewSlice(set, get),
        ...createGameLoopSlice(set, get),
        ...createContractsSlice(set, get),
        ...createCombatSlice(set, get),
        ...createTravelSlice(set, get),
        ...createLocationsSlice(set, get),
        ...createUiSlice(set),
        ...createShopSlice(set, get),
        ...createServicesSlice(set, get),
        ...createTradeSlice(set, get),
        ...createCrewManagementSlice(set, get),

        // Artifact functions
        researchArtifact: (artifactId) => {
            const state = get();
            const artifact = state.artifacts.find((a) => a.id === artifactId);

            if (!artifact) {
                get().addLog("Артефакт не найден!", "error");
                return;
            }

            if (!artifact.discovered) {
                get().addLog("Артефакт ещё не обнаружен!", "error");
                return;
            }

            if (artifact.researched) {
                get().addLog("Артефакт уже изучен!", "warning");
                return;
            }

            const scientists = state.crew.filter(
                (c) => c.profession === "scientist",
            );
            const maxScientistLevel =
                scientists.length > 0
                    ? Math.max(...scientists.map((s) => s.level || 1))
                    : 0;

            if (maxScientistLevel < artifact.requiresScientistLevel) {
                get().addLog(
                    `Требуется учёный уровня ${artifact.requiresScientistLevel}!`,
                    "error",
                );
                return;
            }

            // Research the artifact
            set((s) => ({
                artifacts: s.artifacts.map((a) =>
                    a.id === artifactId
                        ? {
                              ...a,
                              researched: true,
                              effect: { ...a.effect, active: true },
                          }
                        : a,
                ),
            }));

            playSound("success");
            get().addLog(`★ ${artifact.name} изучен и активирован!`, "info");
            get().addLog(`Эффект: ${artifact.description}`, "info");

            // Give experience to scientists
            scientists.forEach((s) =>
                get().gainExp(s, artifact.requiresScientistLevel * 25),
            );
        },

        toggleArtifact: (artifactId) => {
            const state = get();
            const artifact = state.artifacts.find((a) => a.id === artifactId);

            if (!artifact || !artifact.researched) return;

            // Check if artifact is cursed and player has scientist to deactivate
            const newActive = !artifact.effect.active;
            if (!newActive && artifact.cursed) {
                // Deactivating cursed artifact - need scientist level 3+
                const scientist = state.crew.find(
                    (c) => c.profession === "scientist" && c.level >= 3,
                );
                if (!scientist) {
                    get().addLog(
                        "⚠️ Нельзя отключить проклятый артефакт без учёного 3+ уровня!",
                        "error",
                    );
                    playSound("error");
                    return;
                }
                // Damage the scientist
                const damage = 20;
                set((s) => ({
                    crew: s.crew.map((c) =>
                        c.id === scientist.id
                            ? { ...c, health: Math.max(1, c.health - damage) }
                            : c,
                    ),
                }));
                get().addLog(
                    `⚠️ ${scientist.name} пострадал от проклятия! -${damage} здоровья`,
                    "warning",
                );
            }

            set((s) => ({
                artifacts: s.artifacts.map((a) =>
                    a.id === artifactId
                        ? {
                              ...a,
                              effect: { ...a.effect, active: newActive },
                          }
                        : a,
                ),
            }));

            get().addLog(
                `${artifact.name}: ${newActive ? "активирован" : "деактивирован"}`,
                "info",
            );
            playSound(newActive ? "artifact" : "error");
            get().updateShipStats();
        },

        tryFindArtifact: () => {
            const state = get();

            // Check for artifact finder bonus
            const artifactFinder = state.artifacts.find(
                (a) => a.effect.type === "artifact_finder" && a.effect.active,
            );
            let artifactFinderBonus = artifactFinder
                ? getArtifactEffectValue(artifactFinder, state)
                : 1;

            // Apply crystalline artifactBonus (+15% to artifact effects)
            state.crew.forEach((c) => {
                const race = RACES[c.race];
                if (race?.specialTraits) {
                    const trait = race.specialTraits.find(
                        (t) => t.id === "resonance" && t.effects.artifactBonus,
                    );
                    if (trait && artifactFinderBonus > 1) {
                        artifactFinderBonus =
                            1 +
                            (artifactFinderBonus - 1) *
                                (1 + Number(trait.effects.artifactBonus));
                    }
                }
            });

            // Base chance depends on tier and context
            const tier = state.currentSector?.tier ?? 1;
            const baseChance = 0.02 * tier * artifactFinderBonus;

            if (Math.random() > baseChance) return null;

            const artifact = getRandomUndiscoveredArtifact(state.artifacts);
            if (!artifact) return null;

            // Mark as discovered
            set((s) => ({
                artifacts: s.artifacts.map((a) =>
                    a.id === artifact.id ? { ...a, discovered: true } : a,
                ),
            }));

            // Complete mining contracts (crystalline quest - find artifact)
            const miningContract = get().activeContracts.find(
                (c) => c.type === "mining" && c.isRaceQuest,
            );
            if (miningContract) {
                set((s) => ({
                    credits: s.credits + (miningContract.reward || 0),
                }));
                get().addLog(
                    `Кристалл Древних найден! +${miningContract.reward}₢`,
                    "info",
                );
                set((s) => ({
                    completedContractIds: [
                        ...s.completedContractIds,
                        miningContract.id,
                    ],
                    activeContracts: s.activeContracts.filter(
                        (ac) => ac.id !== miningContract.id,
                    ),
                }));
            }

            playSound("success");
            return artifact;
        },

        discoverRace: (raceId: RaceId) => {
            set((state) => {
                if (state.knownRaces.includes(raceId)) return state;
                const race = RACES[raceId];
                if (race) {
                    get().addLog(
                        `Открыта новая раса: ${race.icon} ${race.pluralName}!`,
                        "info",
                    );
                }
                return {
                    knownRaces: [...state.knownRaces, raceId],
                };
            });
        },

        trainCrew: (crewMemberId: number) => {
            const state = get();
            const crewMember = state.crew.find((c) => c.id === crewMemberId);
            if (!crewMember) return;

            // Progressive pricing: level 1→2 = 500, 2→3 = 1500, max level 3
            const currentLevel = crewMember.level || 1;
            if (currentLevel >= 3) {
                get().addLog(
                    "Максимальный уровень обучения в академии (ур.3)!",
                    "error",
                );
                return;
            }

            const cost = currentLevel === 1 ? 500 : 1500;
            if (state.credits < cost) {
                get().addLog(
                    `Недостаточно кредитов для обучения! Нужно ${cost}₢`,
                    "error",
                );
                return;
            }

            set((s) => ({
                credits: s.credits - cost,
                crew: s.crew.map((c) =>
                    c.id === crewMemberId
                        ? { ...c, level: c.level + 1, exp: 0 }
                        : c,
                ),
            }));

            get().addLog(
                `🎓 ${crewMember.name} повышен до уровня ${crewMember.level + 1}!`,
                "info",
            );
            playSound("success");
        },

        scanSector: () => {
            const state = get();
            const cost = 300;

            if (state.credits < cost) {
                get().addLog(
                    "Недостаточно кредитов для сканирования!",
                    "error",
                );
                return;
            }

            // Reveal all locations in current sector
            set((s) => ({
                credits: s.credits - cost,
                currentSector: s.currentSector
                    ? {
                          ...s.currentSector,
                          locations: s.currentSector.locations.map((loc) => ({
                              ...loc,
                              signalRevealed: true,
                          })),
                      }
                    : null,
            }));

            get().addLog(
                `📚 Архивы синтетиков: все локации в секторе отсканированы!`,
                "info",
            );

            // Find 3 random artifacts and reveal their general location
            const undiscoveredArtifacts = state.artifacts.filter(
                (a) => !a.discovered && a.id !== "ai_core",
            );
            if (undiscoveredArtifacts.length > 0) {
                const hintsCount = Math.min(3, undiscoveredArtifacts.length);
                const hints: string[] = [];

                for (let i = 0; i < hintsCount; i++) {
                    const artifact = undiscoveredArtifacts[i];
                    hints.push(`${artifact.name}`);

                    // Mark as hinted (not discovered, but player knows about it)
                    set((s) => ({
                        artifacts: s.artifacts.map((a) =>
                            a.id === artifact.id ? { ...a, hinted: true } : a,
                        ),
                    }));
                }

                get().addLog(
                    `💡 Подсказки об артефактах: ${hints.join(", ")}`,
                    "info",
                );
            }

            playSound("success");
        },

        boostArtifact: (artifactId: string) => {
            const state = get();
            const artifact = state.artifacts.find((a) => a.id === artifactId);

            if (!artifact || !artifact.effect.active) {
                get().addLog("Выберите активный артефакт!", "error");
                return;
            }

            // Mark artifact as boosted (actual bonus applied via activeEffect)
            set((s) => ({
                artifacts: s.artifacts.map((a) =>
                    a.id === artifactId ? { ...a, boosted: true } : a,
                ),
            }));

            get().addLog(`🔮 ${artifact.name} готов к усилению!`, "info");
            playSound("success");
        },

        activatePlanetEffect: (raceId: RaceId, planetId?: string) => {
            const state = get();
            const spec = PLANET_SPECIALIZATIONS[raceId];
            if (!spec) return;

            const cost = spec.cost;
            if (state.credits < cost) {
                get().addLog(
                    `Недостаточно кредитов для ${spec.name}!`,
                    "error",
                );
                return;
            }

            // Apply effects based on race
            switch (raceId) {
                case "xenosymbiont":
                    // +20 max health, +5 regen for 5 turns
                    set((s) => ({
                        credits: s.credits - cost,
                        crew: s.crew.map((c) => ({
                            ...c,
                            maxHealth: c.maxHealth + 20,
                            health: c.health + 20,
                        })),
                        activeEffects: [
                            ...s.activeEffects,
                            {
                                id: `effect-${raceId}-${Date.now()}`,
                                name: spec.name,
                                description: spec.description,
                                raceId,
                                turnsRemaining: 5,
                                effects: [{ type: "health_regen", value: 5 }],
                            },
                        ],
                        planetCooldowns: planetId
                            ? { ...s.planetCooldowns, [planetId]: 999 }
                            : s.planetCooldowns,
                    }));
                    get().addLog(
                        `🧬 ${spec.name}: +20 здоровья экипажу, +5 регенерации за ход (5 ходов)`,
                        "info",
                    );
                    break;

                case "krylorian":
                    // Combat bonuses for 5 turns
                    set((s) => ({
                        credits: s.credits - cost,
                        ship: {
                            ...s.ship,
                            bonusEvasion: (s.ship.bonusEvasion || 0) + 10,
                        },
                        activeEffects: [
                            ...s.activeEffects,
                            {
                                id: `effect-${raceId}-${Date.now()}`,
                                name: spec.name,
                                description: spec.description,
                                raceId,
                                turnsRemaining: 5,
                                effects: [
                                    { type: "combat_bonus", value: 0.15 },
                                    { type: "evasion_bonus", value: 0.1 },
                                ],
                            },
                        ],
                        planetCooldowns: planetId
                            ? { ...s.planetCooldowns, [planetId]: 999 }
                            : s.planetCooldowns,
                    }));
                    get().addLog(
                        `⚔️ ${spec.name}: +15% урон, +10% уклонение (5 ходов)`,
                        "info",
                    );
                    break;

                case "crystalline":
                    // Apply power and shield boost for 5 turns
                    set((s) => ({
                        credits: s.credits - cost,
                        ship: {
                            ...s.ship,
                            maxShields: s.ship.maxShields + 25,
                            shields: s.ship.shields + 25,
                            bonusPower: (s.ship.bonusPower || 0) + 10,
                            bonusShields: (s.ship.bonusShields || 0) + 25,
                        },
                        activeEffects: [
                            ...s.activeEffects,
                            {
                                id: `effect-${raceId}-${Date.now()}`,
                                name: spec.name,
                                description: spec.description,
                                raceId,
                                turnsRemaining: 5,
                                effects: [
                                    { type: "power_boost", value: 10 },
                                    { type: "shield_boost", value: 25 },
                                ],
                            },
                        ],
                        planetCooldowns: planetId
                            ? { ...s.planetCooldowns, [planetId]: 999 }
                            : s.planetCooldowns,
                    }));
                    get().addLog(
                        `💎 ${spec.name}: +10 энергии, +25 щитов (5 ходов)`,
                        "info",
                    );
                    break;

                case "voidborn":
                    // Fuel efficiency bonus for 5 turns
                    set((s) => ({
                        credits: s.credits - cost,
                        activeEffects: [
                            ...s.activeEffects,
                            {
                                id: `effect-${raceId}-${Date.now()}`,
                                name: spec.name,
                                description: spec.description,
                                raceId,
                                turnsRemaining: 5,
                                effects: [
                                    { type: "fuel_efficiency", value: 0.1 },
                                ],
                            },
                        ],
                        planetCooldowns: planetId
                            ? { ...s.planetCooldowns, [planetId]: 999 }
                            : s.planetCooldowns,
                    }));
                    get().addLog(
                        `🔮 ${spec.name}: +10% к эффективности топлива (5 ходов)`,
                        "info",
                    );
                    break;
            }

            playSound("success");
        },

        removeExpiredEffects: () => {
            set((s) => {
                // Find effects that are expiring this turn
                const expiringEffects = s.activeEffects.filter(
                    (e) => e.turnsRemaining === 1,
                );

                // Remove bonuses from expiring effects
                let bonusPowerToRemove = 0;
                let bonusShieldsToRemove = 0;
                let bonusEvasionToRemove = 0;

                // Find artifacts to un-boost
                const artifactsToUnboost: string[] = [];
                expiringEffects.forEach((effect) => {
                    if (effect.targetArtifactId) {
                        artifactsToUnboost.push(effect.targetArtifactId);
                    }
                    effect.effects.forEach((ef) => {
                        if (ef.type === "power_boost") {
                            bonusPowerToRemove += ef.value as number;
                        }
                        if (ef.type === "shield_boost") {
                            bonusShieldsToRemove += ef.value as number;
                        }
                        if (ef.type === "evasion_bonus") {
                            bonusEvasionToRemove += 10; // 10% per effect
                        }
                    });
                });

                // Remove expired effects
                const activeEffects = s.activeEffects
                    .map((effect) => ({
                        ...effect,
                        turnsRemaining: effect.turnsRemaining - 1,
                    }))
                    .filter((effect) => effect.turnsRemaining > 0);

                // Log expired effects
                expiringEffects.forEach((effect) => {
                    get().addLog(`⏱️ Эффект "${effect.name}" истёк`, "warning");
                });

                return {
                    activeEffects,
                    artifacts: s.artifacts.map((a) =>
                        artifactsToUnboost.includes(a.id)
                            ? { ...a, boosted: false }
                            : a,
                    ),
                    ship: {
                        ...s.ship,
                        bonusPower: Math.max(
                            0,
                            (s.ship.bonusPower || 0) - bonusPowerToRemove,
                        ),
                        bonusShields: Math.max(
                            0,
                            (s.ship.bonusShields || 0) - bonusShieldsToRemove,
                        ),
                        bonusEvasion: Math.max(
                            0,
                            (s.ship.bonusEvasion || 0) - bonusEvasionToRemove,
                        ),
                        maxShields: Math.max(
                            0,
                            s.ship.maxShields - bonusShieldsToRemove,
                        ),
                        shields: Math.max(
                            0,
                            s.ship.shields - bonusShieldsToRemove,
                        ),
                    },
                };
            });
        },

        checkGameOver: () => {
            const state = get();
            if (state.gameOver) return; // Already game over

            // Check for AI artifacts/modules that allow ship to operate without crew
            const hasAIArtifact = state.artifacts.some(
                (a) =>
                    a.id === "ai_neural_link" && !a.cursed && a.effect.active,
            );
            const hasAIModule = state.ship.modules.some(
                (m) => m.type === "ai_core" && m.health > 0,
            );
            const canShipOperateWithoutCrew = hasAIArtifact || hasAIModule;

            // Check for hull destroyed (all modules have 0 health)
            const totalHullHealth = state.ship.modules.reduce(
                (sum, m) => sum + m.health,
                0,
            );
            if (totalHullHealth <= 0) {
                set({
                    gameOver: true,
                    gameOverReason:
                        "💥 Корпус корабля разрушен! Все модули уничтожены. Корабль не может продолжать полёт.",
                });
                get().addLog("ИГРА ОКОНЧЕНА: Корпус разрушен", "error");
                return;
            }

            // Check for no crew (without AI core)
            if (state.crew.length === 0 && !canShipOperateWithoutCrew) {
                let reason =
                    "☠️ Весь экипаж погиб! Корабль не может функционировать без экипажа.";

                if (!hasAIArtifact && !hasAIModule) {
                    reason +=
                        " Нет ИИ Ядра (артефакта или модуля) для управления без экипажа.";
                }

                set({
                    gameOver: true,
                    gameOverReason: reason,
                });
                get().addLog("ИГРА ОКОНЧЕНА: Корабль без экипажа", "error");
                return;
            }
        },

        triggerVictory: () => {
            const state = get();
            if (state.gameVictory) return; // Already won

            const turn = state.turn;
            const captainLevel =
                state.crew.find((c) => c.profession === "pilot")?.level ?? 1;
            const discoveredArtifacts = state.artifacts.filter(
                (a) => a.discovered,
            ).length;
            const sectorsExplored = state.galaxy.sectors.filter(
                (s) => s.visited,
            ).length;

            set({
                gameVictory: true,
                gameVictoryReason: `🎉 Поздравляем! Вы достигли границы галактики!

📊 ИТОГИ ИГРЫ:
• Ходов сделано: ${turn}
• Уровень капитана: ${captainLevel}
• Найдено артефактов: ${discoveredArtifacts}
• Исследовано секторов: ${sectorsExplored}

Вы одни из первых, кто достиг Тир 4 - границы известной галактики.
Квантовый двигатель привёл вас сюда, к краю космоса.
Что ждёт за этой гранью? Это уже другая история...`,
            });

            get().addLog("🎉 ПОБЕДА! Граница галактики достигнута!", "info");
            playSound("success");
        },

        restartGame: () => {
            clearLocalStorage();
            // Generate new galaxy and station data for fresh start
            const newSectors = generateGalaxy();
            // Mark the starting sector as visited
            newSectors[0].visited = true;
            const { prices: restartPrices, stock: restartStock } =
                initializeStationData(newSectors);
            set({
                ...initialState,
                currentSector: newSectors[0],
                galaxy: { sectors: newSectors },
                stationPrices: restartPrices,
                stationStock: restartStock,
                log: [],
            });
            get().addLog("Новая игра", "info");
            playSound("success");
            // Auto-save after restart (without logging) so refresh loads the new game
            const state = get();
            saveToLocalStorage(state);
        },

        setAnimationsEnabled: (enabled: boolean) => {
            set((state) => {
                state.settings.animationsEnabled = enabled;
            });
        },

        saveGame: () => {
            const state = get();
            saveToLocalStorage(state);
            get().addLog("Игра сохранена", "info");
        },

        loadGame: () => {
            const saved = loadFromLocalStorage();
            if (!saved) {
                get().addLog("Нет сохранённой игры", "warning");
                // Initialize ship stats for new game
                get().updateShipStats();
                return false;
            }
            // Migration: add settings if missing (for old saves)
            if (!saved.settings) {
                saved.settings = { animationsEnabled: true };
            }
            // Migration: add gameLoadedCount if missing
            if (saved.gameLoadedCount === undefined) {
                saved.gameLoadedCount = 0;
            }
            // Increment load counter to prevent modals from showing
            saved.gameLoadedCount += 1;
            set({ ...saved });
            get().addLog("Игра загружена", "info");
            return true;
        },

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
