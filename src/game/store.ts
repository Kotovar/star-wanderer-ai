import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
    getArtifactEffectValue,
    getRandomUndiscoveredArtifact,
} from "@/game/artifacts";
import { MODULES_BY_LEVEL } from "@/game/components/station";
import { isModuleActive } from "@/game/modules";
import {
    CONTRACT_REWARDS,
    DELIVERY_GOODS,
    PLANET_SPECIALIZATIONS,
    RACES,
    RESEARCH_TREE,
    TRADE_GOODS,
    WEAPON_TYPES,
    RESEARCH_RESOURCES,
} from "@/game/constants";
import { handleSurvivorCapsuleDelivery } from "@/game/contracts";
import { getRandomName, giveCrewExperience } from "@/game/crew";
import { generateGalaxy } from "@/game/galaxy";
import { initialState } from "@/game/initial";
import { areAllModulesConnected } from "@/game/modules";
import {
    clearLocalStorage,
    loadFromLocalStorage,
    saveToLocalStorage,
} from "@/game/saves/utils";
import { determineSignalOutcome } from "@/game/signals";
import { initializeStationData } from "@/game/stations";
import { playSound } from "@/sounds";
import { typedKeys } from "@/lib/utils";
import {
    getAdjacentTechs,
    getAnomalyResources,
    getMiningResources,
} from "@/game/research/utils";
import {
    createLogSlice,
    createShipSlice,
    createScannerSlice,
    createCrewSlice,
    createGameLoopSlice,
    createScanContractsSlice,
    createCombatSlice,
    createTravelSlice,
} from "@/game/slices";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import type { CrewMember, GameStore, Module, RaceId } from "@/game/types";

// Game store
export const useGameStore = create<GameStore>()(
    immer((set, get) => ({
        ...initialState,
        ...createLogSlice(set),
        ...createShipSlice(set, get),
        ...createScannerSlice(set, get),
        ...createCrewSlice(set, get),
        ...createGameLoopSlice(set, get),
        ...createScanContractsSlice(set, get),
        ...createCombatSlice(set, get),
        ...createTravelSlice(set, get),

        selectLocation: (locationIdx) => {
            const state = get();
            const loc = state.currentSector?.locations[locationIdx];
            if (!loc) return;

            // Allow revisiting resolved distress signals to see what was there
            if (loc.type === "distress_signal" && loc.signalResolved) {
                set({ currentLocation: loc });
                set({ gameMode: "distress_signal" });
                return;
            }

            if (state.completedLocations.includes(loc.id)) {
                get().addLog(`${loc.name} уже посещена`, "warning");
                return;
            }

            set({ currentLocation: loc });

            // Mark location as visited (for planet/station visit tracking)
            if (loc.type === "planet" || loc.type === "station") {
                const sector = state.currentSector;
                if (sector) {
                    set((s) => {
                        const newSectors = s.galaxy.sectors.map((sec) => {
                            if (sec.id === sector.id) {
                                return {
                                    ...sec,
                                    locations: sec.locations.map((l) =>
                                        l.id === loc.id
                                            ? { ...l, visited: true }
                                            : l,
                                    ),
                                };
                            }
                            return sec;
                        });

                        // Also update currentSector to reflect the visited status
                        const newCurrentSector =
                            s.currentSector && s.currentSector.id === sector.id
                                ? {
                                      ...s.currentSector,
                                      locations: s.currentSector.locations.map(
                                          (l) =>
                                              l.id === loc.id
                                                  ? { ...l, visited: true }
                                                  : l,
                                      ),
                                  }
                                : s.currentSector;

                        return {
                            galaxy: {
                                ...s.galaxy,
                                sectors: newSectors,
                            },
                            currentSector: newCurrentSector,
                        };
                    });
                }
            }

            // Intra-sector travel always takes a turn (warp coil only works for inter-sector)
            get().nextTurn();

            switch (loc.type) {
                case "station":
                    set({ gameMode: "station" });
                    // Deliver survivor capsules for reward
                    handleSurvivorCapsuleDelivery("station");
                    break;
                case "planet":
                    set({ gameMode: "planet" });
                    // Deliver survivor capsules for reward (only on colonized planets)
                    if (!loc.isEmpty) {
                        handleSurvivorCapsuleDelivery("planet");
                    }
                    // Обработка контрактов на сканирование планет
                    get().processScanContracts();
                    // Завершение выполненных контрактов на сканирование
                    get().completeScanContracts();
                    // Complete diplomacy contracts (human quest - visit human planet)
                    if (loc.dominantRace === "human" && !loc.isEmpty) {
                        const diplomacyContract = get().activeContracts.find(
                            (c) =>
                                c.type === "diplomacy" &&
                                c.isRaceQuest &&
                                c.targetSector === state.currentSector?.id,
                        );
                        if (diplomacyContract) {
                            set((s) => ({
                                credits:
                                    s.credits + (diplomacyContract.reward || 0),
                            }));
                            get().addLog(
                                `Дипломатическая миссия выполнена! +${diplomacyContract.reward}₢`,
                                "info",
                            );

                            // Give experience to all crew members
                            const expReward =
                                CONTRACT_REWARDS.diplomacy.baseExp;
                            giveCrewExperience(
                                expReward,
                                `Экипаж получил опыт: +${expReward} ед.`,
                            );

                            set((s) => ({
                                completedContractIds: [
                                    ...s.completedContractIds,
                                    diplomacyContract.id,
                                ],
                                activeContracts: s.activeContracts.filter(
                                    (ac) => ac.id !== diplomacyContract.id,
                                ),
                            }));
                        }
                    }

                    // Complete supply_run contracts - deliver goods to source planet
                    const supplyComplete = get().activeContracts.filter(
                        (c) =>
                            c.type === "supply_run" &&
                            c.sourcePlanetId === loc.id &&
                            c.cargo,
                    );
                    supplyComplete.forEach((c) => {
                        // Check if player has the required cargo
                        const cargoOwned = state.ship.tradeGoods.find(
                            (g) => g.item === c.cargo,
                        );
                        const requiredQty = c.quantity || 15;
                        if (cargoOwned && cargoOwned.quantity >= requiredQty) {
                            // Remove cargo and complete contract
                            set((s) => ({
                                credits: s.credits + (c.reward || 0),
                                ship: {
                                    ...s.ship,
                                    tradeGoods: s.ship.tradeGoods
                                        .map((g) =>
                                            g.item === c.cargo
                                                ? {
                                                      ...g,
                                                      quantity:
                                                          g.quantity -
                                                          requiredQty,
                                                  }
                                                : g,
                                        )
                                        .filter((g) => g.quantity > 0),
                                },
                                completedContractIds: [
                                    ...s.completedContractIds,
                                    c.id,
                                ],
                                activeContracts: s.activeContracts.filter(
                                    (ac) => ac.id !== c.id,
                                ),
                            }));
                            get().addLog(
                                `📦 Контракт выполнен: ${c.desc} (доставлено на ${c.sourceName}) +${c.reward}₢`,
                                "info",
                            );
                            // Give experience to all crew members
                            const expReward =
                                CONTRACT_REWARDS.supply_run.baseExp;
                            giveCrewExperience(
                                expReward,
                                `Экипаж получил опыт: +${expReward} ед.`,
                            );
                        }
                    });
                    break;
                case "enemy": {
                    // Check scanner level vs enemy threat level
                    const enemyTier = loc.threat ?? 1;
                    const canScanEnemy = get().canScanObject(
                        "enemy",
                        enemyTier,
                    );

                    if (!canScanEnemy && !loc.signalRevealed) {
                        // Early warning system: chance to detect ambush
                        const earlyWarningChance =
                            get().getEarlyWarningChance(enemyTier);
                        const detected =
                            Math.random() * 100 < earlyWarningChance;

                        if (detected) {
                            get().addLog(
                                `📡 Сканер обнаружил засаду! Вы готовы к бою.`,
                                "info",
                            );
                            get().startCombat(loc);
                        } else {
                            set({ gameMode: "unknown_ship" });
                        }
                    } else {
                        get().startCombat(loc);
                    }
                    break;
                }
                case "boss": {
                    // Check if already defeated
                    if (loc.bossDefeated) {
                        get().addLog(`${loc.name} уже уничтожен`, "info");
                        return;
                    }
                    // Bosses are tier 3, need scanner level 3+
                    const canScanBoss = get().canScanObject("boss", 3);

                    if (!canScanBoss && !loc.signalRevealed) {
                        // Early warning for boss: chance to detect with high scanRange
                        const earlyWarningChance =
                            get().getEarlyWarningChance(3);
                        const detected =
                            Math.random() * 100 < earlyWarningChance;

                        if (detected) {
                            get().addLog(
                                `📡 Сканер обнаружил ДРЕВНЮЮ УГРОЗУ! Готовьтесь к бою.`,
                                "warning",
                            );
                            get().startBossCombat(loc);
                        } else {
                            set({ gameMode: "unknown_ship" });
                        }
                    } else {
                        get().startBossCombat(loc);
                    }
                    break;
                }
                case "anomaly": {
                    const anomalyTier = loc.anomalyTier ?? 1;
                    const canScanAnomaly = get().canScanObject(
                        "anomaly",
                        anomalyTier,
                    );

                    if (!canScanAnomaly && !loc.signalRevealed) {
                        set({ gameMode: "unknown_ship" });
                    } else {
                        // Always open anomaly panel, let AnomalyPanel handle scientist check
                        set({ gameMode: "anomaly" });
                    }
                    break;
                }
                case "friendly_ship": {
                    const canScanFriendlyShip =
                        get().canScanObject("friendly_ship");
                    // Check scanner level (friendly ships are tier 1)
                    if (!canScanFriendlyShip && !loc.signalRevealed) {
                        set({ gameMode: "unknown_ship" });
                    } else {
                        set({ gameMode: "friendly_ship" });
                    }
                    break;
                }
                case "asteroid_belt":
                    set({ gameMode: "asteroid_belt" });
                    break;
                case "storm":
                    // Check scanner for storm detection
                    const canScanStorm = get().canScanObject("storm");
                    if (!canScanStorm && !loc.signalRevealed) {
                        // Storm not detected - surprise encounter
                        set({ currentLocation: loc, gameMode: "storm" });
                    } else {
                        // Storm detected - show warning
                        get().addLog(
                            `📡 Сканер обнаружил шторм впереди!`,
                            "warning",
                        );
                        set({ currentLocation: loc, gameMode: "storm" });
                    }
                    break;
                case "distress_signal":
                    // Check scanner for reveal chance (one-time check)
                    if (!loc.signalRevealChecked) {
                        const signalRevealChance =
                            get().getSignalRevealChance();

                        const canReveal =
                            Math.random() * 100 < signalRevealChance;

                        if (canReveal && !loc.signalType) {
                            // Determine outcome and reveal it
                            // Eye of Singularity increases ambush chance by 50%
                            const allSeeing = state.artifacts.find(
                                (a) =>
                                    a.effect.type === "all_seeing" &&
                                    a.effect.active,
                            );
                            const ambushModifier = allSeeing ? 0.5 : 0;
                            const outcome =
                                determineSignalOutcome(ambushModifier);
                            const updatedLocation = {
                                ...loc,
                                signalType: outcome,
                                signalRevealed: true,
                                signalRevealChecked: true,
                            };
                            set((s) => {
                                const updatedSector = s.currentSector
                                    ? {
                                          ...s.currentSector,
                                          locations:
                                              s.currentSector.locations.map(
                                                  (l) =>
                                                      l.id === loc.id
                                                          ? updatedLocation
                                                          : l,
                                              ),
                                      }
                                    : null;
                                return {
                                    currentLocation: updatedLocation,
                                    currentSector: updatedSector,
                                };
                            });
                        } else {
                            // Mark as checked but not revealed
                            const updatedLocation = {
                                ...loc,
                                signalRevealChecked: true,
                            };
                            set((s) => {
                                const updatedSector = s.currentSector
                                    ? {
                                          ...s.currentSector,
                                          locations:
                                              s.currentSector.locations.map(
                                                  (l) =>
                                                      l.id === loc.id
                                                          ? updatedLocation
                                                          : l,
                                              ),
                                      }
                                    : null;
                                return {
                                    currentLocation: updatedLocation,
                                    currentSector: updatedSector,
                                };
                            });
                        }
                    }
                    set({ gameMode: "distress_signal" });
                    break;
            }
        },

        travelThroughBlackHole: () => {
            // TODO: если несколько раз прыгнуть через ЧД - то экипаж умрёт, но игра не закончится
            // В игре есть логика - что без экипажа игра заканчивается, только если нет специального модуля
            // или артефакта. Нужно сделать правки для проверки конца игры после прыжка через ЧД
            const state = get();
            const currentSector = state.currentSector;

            // Check if current sector has a black hole
            if (!currentSector || currentSector.star?.type !== "blackhole") {
                get().addLog("В этом секторе нет чёрной дыры!", "error");
                return;
            }

            // Find other black holes
            const otherBlackHoles = state.galaxy.sectors.filter(
                (s) =>
                    s.star?.type === "blackhole" && s.id !== currentSector.id,
            );

            if (otherBlackHoles.length === 0) {
                get().addLog(
                    "Нет другой чёрной дыры для телепортации!",
                    "error",
                );
                return;
            }

            // Pick random destination black hole
            const destination =
                otherBlackHoles[
                    Math.floor(Math.random() * otherBlackHoles.length)
                ];

            // Check for scientist to reduce damage
            const scientist = state.crew.find(
                (c) => c.profession === "scientist",
            );
            const damageReduction = scientist ? 0.5 : 1; // 50% damage reduction with scientist

            // Calculate base damage
            const baseModuleDamage = Math.floor(
                (15 + Math.random() * 20) * damageReduction,
            );
            const baseCrewDamage = Math.floor(
                (10 + Math.random() * 15) * damageReduction,
            );

            // Apply damage to random modules
            const damagedModules = [...state.ship.modules];
            const numModulesToDamage = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numModulesToDamage; i++) {
                const randomIdx = Math.floor(
                    Math.random() * damagedModules.length,
                );
                damagedModules[randomIdx] = {
                    ...damagedModules[randomIdx],
                    health: Math.max(
                        1,
                        damagedModules[randomIdx].health - baseModuleDamage,
                    ),
                };
            }

            // Apply damage to crew
            const damagedCrew = state.crew.map((c) => ({
                ...c,
                health: Math.max(1, c.health - baseCrewDamage),
                happiness: Math.max(0, c.happiness - 15),
            }));

            // Teleport to destination
            playSound("travel");
            set({
                currentSector: destination,
                ship: { ...state.ship, modules: damagedModules },
                crew: damagedCrew,
                gameMode: "sector_map",
            });

            // Log the event
            get().addLog(`🕳️ ТЕЛЕПОРТАЦИЯ через чёрную дыру!`, "warning");
            get().addLog(`Прибытие в ${destination.name}`, "info");
            get().addLog(
                `Модули повреждены: -${baseModuleDamage}% каждому из ${numModulesToDamage} модулей`,
                "error",
            );
            get().addLog(
                `Экипаж пострадал: -${baseCrewDamage} здоровья`,
                "error",
            );

            // Give scientist experience if present
            if (scientist) {
                get().gainExp(scientist, 50);
                get().addLog(
                    `${scientist.name} изучил чёрную дыру! +50 опыта`,
                    "info",
                );
            }

            get().nextTurn();
        },

        mineAsteroid: () => {
            const state = get();
            const loc = state.currentLocation;

            if (!loc || loc.type !== "asteroid_belt") {
                get().addLog("Это не пояс астероидов!", "error");
                return;
            }

            if (loc.mined) {
                get().addLog("Этот пояс уже разработан!", "warning");
                return;
            }

            const drillLevel = get().getDrillLevel();
            const asteroidTier = loc.asteroidTier || 1;

            if (drillLevel < asteroidTier) {
                get().addLog(
                    `Нужен бур уровня ${asteroidTier}! У вас: уровень ${drillLevel}`,
                    "error",
                );
                playSound("error");
                return;
            }

            // Mining success
            const resources = loc.resources || {
                minerals: 0,
                rare: 0,
                credits: 0,
            };
            // Efficiency bonus based on drill level difference
            // Tier 1: drill 1=0%, 2=20%, 3=40%, 4=70%
            // Tier 2: drill 2=0%, 3=20%, 4=50%
            // Tier 3: drill 3=0%, 4=30%
            // Tier 4: drill 4=0%
            let efficiencyBonus = 1;
            if (drillLevel === 4 && asteroidTier < 4) {
                // Ancient drill bonus
                efficiencyBonus = 1 + [0.7, 0.5, 0.3, 0][asteroidTier - 1];
            } else if (drillLevel > asteroidTier) {
                // Regular drill bonus: 20% per level above
                efficiencyBonus = 1 + (drillLevel - asteroidTier) * 0.2;
            }

            // Бонус от сращивания ксеноморфа с drill
            const mergeBonus = getMergeEffectsBonus(
                state.crew,
                state.ship.modules,
            );
            if (mergeBonus.resourceYield) {
                efficiencyBonus *= 1 + mergeBonus.resourceYield / 100;
            }
            // const bonusPercent = Math.round((efficiencyBonus - 1) * 100);

            const mineralsGained = Math.floor(
                resources.minerals * efficiencyBonus,
            );
            const rareGained = Math.floor(resources.rare * efficiencyBonus);
            const creditsGained = Math.floor(
                resources.credits * efficiencyBonus,
            );

            // Get research resources from mining
            const researchResources = getMiningResources(drillLevel);

            // Calculate cargo space needed
            const currentCargo = state.ship.tradeGoods.reduce(
                (sum, tg) => sum + tg.quantity,
                0,
            );
            const cargoCapacity = get().getCargoCapacity();
            const cargoSpaceLeft = Math.max(0, cargoCapacity - currentCargo);

            // Add to cargo/trade goods (limited by capacity)
            let addedMinerals = mineralsGained;
            let addedRare = rareGained;

            // Check if we have space
            const totalNeeded = mineralsGained + rareGained;
            if (totalNeeded > cargoSpaceLeft) {
                if (cargoSpaceLeft === 0) {
                    // No space at all - lose everything
                    addedMinerals = 0;
                    addedRare = 0;
                    get().addLog(
                        "⚠️ Нет места в грузовом отсеке! Ресурсы потеряны.",
                        "warning",
                    );
                } else {
                    // Some space left - fill it proportionally, but ensure at least 1 of each if possible
                    const scale = cargoSpaceLeft / totalNeeded;
                    addedMinerals = Math.max(
                        1,
                        Math.floor(mineralsGained * scale),
                    );
                    addedRare = Math.max(1, Math.floor(rareGained * scale));

                    // If we can't fit both, prioritize minerals
                    if (addedMinerals + addedRare > cargoSpaceLeft) {
                        addedRare = Math.max(0, cargoSpaceLeft - addedMinerals);
                    }

                    get().addLog(
                        `⚠️ Недостаточно места! Получено: ${addedMinerals + addedRare} из ${totalNeeded}т`,
                        "warning",
                    );
                }
            }

            set((s) => ({
                credits: s.credits + creditsGained,
                ship: {
                    ...s.ship,
                    tradeGoods: [
                        ...s.ship.tradeGoods,
                        ...(addedMinerals > 0
                            ? [
                                  {
                                      item: "minerals" as const,
                                      quantity: addedMinerals,
                                      buyPrice: 0,
                                  },
                              ]
                            : []),
                        ...(addedRare > 0
                            ? [
                                  {
                                      item: "rare_minerals" as const,
                                      quantity: addedRare,
                                      buyPrice: 0,
                                  },
                              ]
                            : []),
                    ],
                },
                research: {
                    ...s.research,
                    resources: {
                        ...s.research.resources,
                        ...researchResources.reduce(
                            (acc, res) => ({
                                ...acc,
                                [res.type]:
                                    (s.research.resources[
                                        res.type as keyof typeof s.research.resources
                                    ] || 0) + res.quantity,
                            }),
                            {},
                        ),
                    },
                },
            }));

            // Log research resources gained
            researchResources.forEach((res) => {
                if (res.quantity > 0) {
                    get().addLog(
                        `💎 Получены исследовательские ресурсы: ${RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].icon} ${RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].name} x${res.quantity}`,
                        "info",
                    );
                }
            });

            // Mark as mined
            set((s) => ({
                currentLocation: s.currentLocation
                    ? { ...s.currentLocation, mined: true }
                    : null,
                completedLocations: [...s.completedLocations, loc.id],
            }));

            playSound("success");
            // Log results (order matters for display - newest first)
            get().addLog(`Кредиты: +${creditsGained}₢`, "info");
            if (rareGained > 0)
                get().addLog(`Редкие минералы: +${rareGained}`, "info");
            get().addLog(`Минералы: +${mineralsGained}`, "info");

            // Give engineer experience
            const engineer = state.crew.find(
                (c) => c.profession === "engineer",
            );
            if (engineer) get().gainExp(engineer, 15 * asteroidTier);

            // DON'T close the panel - let player see results
            get().nextTurn();
        },

        enterStorm: () => {
            const state = get();
            const loc = state.currentLocation;

            if (!loc || loc.type !== "storm") {
                get().addLog("Это не шторм!", "error");
                return;
            }

            // Prevent double entry - mark as completed immediately
            if (state.completedLocations.includes(loc.id)) {
                get().addLog(`${loc.name} уже исследован`, "warning");
                return;
            }

            // Mark as completed and revealed to prevent double entry and show on map
            set((s) => ({
                completedLocations: [...s.completedLocations, loc.id],
                currentSector: s.currentSector
                    ? {
                          ...s.currentSector,
                          locations: s.currentSector.locations.map((l) =>
                              l.id === loc.id
                                  ? { ...l, signalRevealed: true }
                                  : l,
                          ),
                      }
                    : s.currentSector,
            }));

            const stormType = loc.stormType || "radiation";
            const intensity = loc.stormIntensity || 1;

            // Calculate damage based on storm type and intensity
            let shieldDamage = 0;
            let moduleDamage = 0;
            let crewDamage = 0;
            let lootMultiplier = 1;
            let disableModules = false; // For nanite storm
            let resetExp = false; // For temporal storm
            let damageAllModules = false; // For gravitational storm

            switch (stormType) {
                case "radiation":
                    // Radiation: damage crew (~25% of max HP) and small module damage
                    crewDamage = (25 + Math.random() * 10) * intensity; // ~25-35% of max 100 HP
                    moduleDamage = (5 + Math.random() * 5) * intensity;
                    lootMultiplier = 2;
                    break;
                case "ionic":
                    // Ionic: strip ALL shields, small module damage
                    shieldDamage = state.ship.shields; // Remove all shields
                    moduleDamage = (8 + Math.random() * 7) * intensity;
                    lootMultiplier = 2.5;
                    break;
                case "plasma":
                    // Plasma: damage shields AND modules
                    shieldDamage = (25 + Math.random() * 20) * intensity;
                    moduleDamage = (18 + Math.random() * 12) * intensity;
                    lootMultiplier = 3;
                    break;
                case "gravitational":
                    // Gravitational: heavy module damage to ALL modules from gravitational compression
                    moduleDamage = (20 + Math.random() * 15) * intensity;
                    damageAllModules = true;
                    lootMultiplier = 2.5;
                    break;
                case "temporal":
                    // Temporal: crew damage from desynchronization, reset current level EXP
                    crewDamage = (15 + Math.random() * 10) * intensity;
                    resetExp = true;
                    lootMultiplier = 2.5;
                    break;
                case "nanite":
                    // Nanite: disable ALL modules, small damage to modules and shields
                    disableModules = true;
                    moduleDamage = (10 + Math.random() * 8) * intensity;
                    shieldDamage = (15 + Math.random() * 10) * intensity;
                    lootMultiplier = 2; // Only credits, no special resources
                    break;
            }

            // Apply shield damage
            const newShields = Math.max(0, state.ship.shields - shieldDamage);

            // Apply module damage to random modules
            const damagedModules = [...state.ship.modules];
            const modulesDamagedList: { name: string; damage: number }[] = [];

            if (disableModules) {
                // Nanite storm: disable ALL modules
                damagedModules.forEach((mod, idx) => {
                    const damage = Math.floor(moduleDamage);
                    damagedModules[idx] = {
                        ...mod,
                        health: Math.max(10, mod.health - damage),
                        manualDisabled: true, // Disable all modules
                    };
                    modulesDamagedList.push({
                        name: mod.name,
                        damage: damage,
                    });
                });
            } else if (damageAllModules) {
                // Gravitational storm: damage ALL modules
                damagedModules.forEach((mod, idx) => {
                    const damage = Math.floor(moduleDamage);
                    damagedModules[idx] = {
                        ...mod,
                        health: Math.max(10, mod.health - damage),
                    };
                    modulesDamagedList.push({
                        name: mod.name,
                        damage: damage,
                    });
                });
            } else {
                // Normal storm: damage random modules
                const numModulesToDamage = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < numModulesToDamage; i++) {
                    const randomIdx = Math.floor(
                        Math.random() * damagedModules.length,
                    );
                    const damage = Math.floor(moduleDamage);
                    damagedModules[randomIdx] = {
                        ...damagedModules[randomIdx],
                        health: Math.max(
                            10,
                            damagedModules[randomIdx].health - damage,
                        ),
                    };
                    modulesDamagedList.push({
                        name: damagedModules[randomIdx].name,
                        damage: damage,
                    });
                }
            }

            // Apply crew damage
            const damagedCrew = state.crew.map((c) => ({
                ...c,
                health: Math.max(10, c.health - Math.floor(crewDamage)),
                happiness: Math.max(0, c.happiness - 10),
            }));

            // Handle temporal storm: reset current level EXP for all crew
            if (resetExp) {
                damagedCrew.forEach((c) => {
                    c.exp = 0;
                });
            }

            // Calculate loot (storms give better rewards than random events)
            const baseLoot = Math.floor(
                (80 + Math.random() * 70) * intensity * lootMultiplier,
            );
            const rareLootChance = 0.1 * intensity * lootMultiplier;
            const rareLoot = Math.random() < rareLootChance;
            let rareBonus = 0;
            if (rareLoot) {
                rareBonus = Math.floor(100 + Math.random() * 150) * intensity;
            }

            // Handle special storm resources
            const specialResources: { type: string; amount: number }[] = [];
            if (stormType === "gravitational") {
                // Gravitational storm gives quantum crystals
                const crystalAmount = Math.floor(
                    (15 + Math.random() * 10) * intensity,
                );
                specialResources.push({
                    type: "quantum_crystals",
                    amount: crystalAmount,
                });
            } else if (stormType === "temporal") {
                // Temporal storm gives ancient data
                const dataAmount = Math.floor(
                    (20 + Math.random() * 15) * intensity,
                );
                specialResources.push({
                    type: "ancient_data",
                    amount: dataAmount,
                });
            }
            // Nanite storm only gives credits (no special resources)

            // Apply changes
            set((s) => ({
                ship: {
                    ...s.ship,
                    shields: newShields,
                    modules: damagedModules,
                },
                crew: damagedCrew,
                credits: s.credits + baseLoot + rareBonus,
                research: {
                    ...s.research,
                    resources: {
                        ...s.research.resources,
                        quantum_crystals:
                            (s.research.resources.quantum_crystals || 0) +
                            (specialResources.find(
                                (r) => r.type === "quantum_crystals",
                            )?.amount || 0),
                        ancient_data:
                            (s.research.resources.ancient_data || 0) +
                            (specialResources.find(
                                (r) => r.type === "ancient_data",
                            )?.amount || 0),
                    },
                },
                stormResult: {
                    stormName: loc.name,
                    stormType,
                    intensity,
                    shieldDamage: Math.floor(shieldDamage),
                    moduleDamage: modulesDamagedList,
                    moduleDamagePercent: Math.floor(moduleDamage),
                    numModulesDamaged: disableModules
                        ? damagedModules.length
                        : modulesDamagedList.length,
                    crewDamage: Math.floor(crewDamage),
                    creditsEarned: baseLoot + rareBonus,
                    rareLoot,
                    rareBonus: rareLoot ? rareBonus : undefined,
                    specialResources:
                        specialResources.length > 0
                            ? specialResources
                            : undefined,
                },
                gameMode: "storm_results",
            }));

            playSound("combat");

            // Give scientist experience for studying the storm
            const scientist = state.crew.find(
                (c) => c.profession === "scientist",
            );
            if (scientist) {
                get().gainExp(scientist, 25 * intensity);
            }

            // Complete rescue contracts (voidborn quest - survive storm in target sector)
            const rescueContract = get().activeContracts.find(
                (c) =>
                    c.type === "rescue" &&
                    c.isRaceQuest &&
                    c.sectorId === state.currentSector?.id,
            );
            if (rescueContract) {
                set((s) => ({
                    credits: s.credits + (rescueContract.reward || 0),
                }));
                get().addLog(
                    `Путешествие в Пустоту завершено! +${rescueContract.reward}₢`,
                    "info",
                );

                // Give experience to all crew members
                const expReward = CONTRACT_REWARDS.rescue.baseExp;
                giveCrewExperience(
                    expReward,
                    `Экипаж получил опыт: +${expReward} ед.`,
                );

                set((s) => ({
                    completedContractIds: [
                        ...s.completedContractIds,
                        rescueContract.id,
                    ],
                    activeContracts: s.activeContracts.filter(
                        (ac) => ac.id !== rescueContract.id,
                    ),
                }));
            }

            // DON'T close the panel - let player see results and click "Leave"
            get().updateShipStats();
            get().nextTurn();
        },

        showGalaxyMap: () => set({ gameMode: "galaxy_map" }),
        showSectorMap: () => set({ gameMode: "sector_map" }),
        showAssignments: () => set({ gameMode: "assignments" }),
        closeArtifactsPanel: () =>
            set((state) => ({
                gameMode: state.previousGameMode || "galaxy_map",
                previousGameMode: null,
            })),
        closeResearchPanel: () =>
            set((state) => ({
                gameMode: state.previousGameMode || "galaxy_map",
                previousGameMode: null,
            })),

        buyItem: (item, targetModuleId) => {
            const state = get();
            if (state.credits < item.price) {
                get().addLog("Недостаточно кредитов!", "error");
                return;
            }

            const stationId = state.currentLocation?.stationId;
            if (!stationId) return;

            // Get inventory for this station (used for regular items)
            const inv = state.stationInventory[stationId] || {};
            const bought = inv[item.id] || 0;

            // Upgrades don't have stock limits - they're services, not physical goods
            if (item.type !== "upgrade") {
                if (bought >= item.stock) {
                    get().addLog("Товар распродан!", "error");
                    return;
                }
            }

            if (item.type === "upgrade" && item.targetType) {
                // Find the specific module to upgrade, or the first matching one if no targetModuleId
                let tgt: Module | undefined;
                if (targetModuleId !== undefined) {
                    tgt = state.ship.modules.find(
                        (m) =>
                            m.id === targetModuleId &&
                            m.type === item.targetType,
                    );
                } else {
                    tgt = state.ship.modules.find(
                        (m) => m.type === item.targetType,
                    );
                }

                if (!tgt) {
                    get().addLog(`Нет модуля ${item.targetType}!`, "error");
                    return;
                }

                // Check if module is already at max upgrade level (3)
                // Level 4 modules can only be found, not upgraded to
                const currentLevel = tgt.level || 1;
                if (currentLevel >= 3) {
                    get().addLog(
                        "Максимальный уровень улучшения! (LV3)",
                        "error",
                    );
                    get().addLog(
                        "Модули LV4 можно только найти в секторах тир 3 или у боссов.",
                        "warning",
                    );
                    return;
                }

                // Calculate next level first
                const nextLevel = currentLevel + 1;

                // Special handling for engine upgrades (no engine-2, engine-3 templates)
                if (item.targetType === "engine") {
                    // Engine upgrades only improve fuel efficiency
                    const fuelEfficiencyImprovement =
                        item.effect?.fuelEfficiency || 0;

                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m) =>
                                m.id === tgt.id
                                    ? {
                                          ...m,
                                          fuelEfficiency: Math.max(
                                              1,
                                              (m.fuelEfficiency || 10) +
                                                  fuelEfficiencyImprovement,
                                          ),
                                          level: nextLevel,
                                          defense: nextLevel,
                                          maxHealth: (m.maxHealth || 100) + 20,
                                          health: (m.health || 100) + 20,
                                      }
                                    : m,
                            ),
                        },
                        credits: s.credits - item.price,
                    }));

                    const updatedModule = get().ship.modules.find(
                        (m) => m.id === tgt.id,
                    );
                    get().addLog(
                        `Модуль "${updatedModule?.name}" улучшен до LV${updatedModule?.level}`,
                        "info",
                    );
                    get().updateShipStats(); // Immediately update ship stats
                    playSound("success");
                    return;
                }

                // Find the target module template from MODULES_BY_LEVEL
                const targetModuleTemplate = (
                    MODULES_BY_LEVEL[nextLevel] || []
                ).find((m) => m.moduleType === item.targetType);

                if (!targetModuleTemplate) {
                    get().addLog(
                        `Нет модуля ${nextLevel} уровня для улучшения!`,
                        "error",
                    );
                    return;
                }

                // Check if there's enough space on the ship for the upgraded module
                const newWidth = targetModuleTemplate.width || tgt.width;
                const newHeight = targetModuleTemplate.height || tgt.height;

                if (newWidth > tgt.width || newHeight > tgt.height) {
                    // Need to check if there's enough space around the module
                    get().addLog(
                        `⚠ Для улучшения нужно больше места! Модуль станет ${newWidth}x${newHeight}`,
                        "warning",
                    );
                    // For now, allow the upgrade but the player needs to ensure there's space
                    // A more sophisticated check would require grid-based placement validation
                }

                // Apply the upgrade by copying properties from the target module template
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === tgt.id
                                ? {
                                      ...m,
                                      // Copy properties from the template
                                      name: targetModuleTemplate.name,
                                      width: newWidth,
                                      height: newHeight,
                                      consumption:
                                          targetModuleTemplate.consumption || 0,
                                      power: targetModuleTemplate.power,
                                      capacity: targetModuleTemplate.capacity,
                                      oxygen: targetModuleTemplate.oxygen,
                                      scanRange: targetModuleTemplate.scanRange,
                                      fuelEfficiency:
                                          targetModuleTemplate.fuelEfficiency,
                                      ...(targetModuleTemplate.researchOutput && {
                                          researchOutput:
                                              targetModuleTemplate.researchOutput,
                                      }),
                                      ...(targetModuleTemplate.healing && {
                                          healing: targetModuleTemplate.healing,
                                      }),
                                      ...(targetModuleTemplate.shields && {
                                          shields: targetModuleTemplate.shields,
                                      }),
                                      // Keep position
                                      x: m.x,
                                      y: m.y,
                                      // Update level, defense, and health based on new level
                                      level: nextLevel,
                                      defense: nextLevel, // Defense equals module level
                                      // Max health based on level (100/120/140)
                                      maxHealth:
                                          nextLevel === 2
                                              ? 120
                                              : nextLevel === 3
                                                ? 140
                                                : 100,
                                      health:
                                          nextLevel === 2
                                              ? 120
                                              : nextLevel === 3
                                                ? 140
                                                : 100, // Heal to new max
                                  }
                                : m,
                        ),
                    },
                }));

                set((s) => ({
                    credits: s.credits - item.price,
                }));

                // Re-read the module to get updated values
                const updatedModule = get().ship.modules.find(
                    (m) => m.id === tgt.id,
                );
                get().addLog(
                    `Модуль "${updatedModule?.name}" улучшен до LV${updatedModule?.level}`,
                    "info",
                );
                get().updateShipStats(); // Immediately update ship stats
                playSound("success");
            } else if (item.type === "module") {
                // Check if player already has a scanner or drill (can only have 1)
                // Exception: unique level 4 modules (ancient, quantum) can be purchased as upgrades
                const hasScanner = state.ship.modules.some(
                    (m) => m.type === "scanner",
                );
                const hasDrill = state.ship.modules.some(
                    (m) => m.type === "drill",
                );
                const isUniqueScanner =
                    item.moduleType === "scanner" &&
                    item.id.includes("quantum");
                const isUniqueDrill =
                    item.moduleType === "drill" && item.id.includes("ancient");
                const isRegularScanner =
                    item.moduleType === "scanner" && !isUniqueScanner;
                const isRegularDrill =
                    item.moduleType === "drill" && !isUniqueDrill;

                if (
                    (isRegularScanner && hasScanner) ||
                    (isRegularDrill && hasDrill)
                ) {
                    get().addLog(
                        "Можно иметь только один такой модуль!",
                        "error",
                    );
                    return;
                }

                // Try to place module
                // Get station config for cargo bonus
                const stationConfig = state.currentLocation?.stationConfig;
                const cargoBonus = stationConfig?.cargoBonus ?? 1;

                // Build module with only relevant properties
                const newMod: Module = {
                    id: state.ship.modules.length + 1,
                    type: item.moduleType,
                    name: item.name,
                    x: 0,
                    y: 0,
                    width: item.width || 1,
                    height: item.height || 1,
                    // Level from item or default to 1
                    level: item.level ?? 1,
                    // Max health from item or based on level (100/120/140/200)
                    maxHealth:
                        item.maxHealth ??
                        (item.level === 2
                            ? 120
                            : item.level === 3
                              ? 140
                              : item.level === 4
                                ? 200
                                : 100),
                    health:
                        item.maxHealth ??
                        (item.level === 2
                            ? 120
                            : item.level === 3
                              ? 140
                              : item.level === 4
                                ? 200
                                : 100),
                    // Defense based on module level (1 defense per level, max 5 for rare tier 4)
                    defense: item.level === 4 ? 5 : (item.level ?? 1),
                    ...(item.moduleType === "reactor" && {
                        power: item.power || 10,
                    }),
                    ...(item.moduleType === "engine" && {
                        fuelEfficiency: item.fuelEfficiency ?? 10,
                        consumption: item.consumption || 1,
                    }),
                    ...(item.moduleType === "drill" && {
                        consumption: item.consumption || 1,
                    }),
                    ...(item.moduleType === "cargo" && {
                        capacity: Math.floor(
                            (item.capacity || 50) * cargoBonus,
                        ),
                        consumption: item.consumption || 1,
                    }),
                    ...(item.moduleType === "fueltank" && {
                        capacity: item.capacity || 100,
                    }),
                    ...(item.moduleType === "lab" && {
                        consumption: item.consumption || 3,
                        researchOutput: item.researchOutput || 5,
                    }),
                    ...(item.moduleType === "shield" && {
                        shields: item.shields || 20,
                        consumption: item.consumption || 3,
                    }),
                    ...(item.moduleType === "scanner" && {
                        scanRange: item.scanRange || 3,
                        consumption: item.consumption || 1,
                    }),
                    ...(item.moduleType === "lifesupport" && {
                        oxygen: item.oxygen || 5,
                        consumption: item.consumption || 2,
                    }),
                    ...(item.moduleType === "medical" && {
                        healing: item.healing || 8,
                        consumption: item.consumption || 2,
                    }),
                    ...(item.moduleType === "weaponbay" && {
                        weapons: Array(
                            (item.width || 1) * (item.height || 1),
                        ).fill(null),
                        consumption: item.consumption || 2,
                    }),
                    ...(item.moduleType === "cockpit" && { consumption: 1 }),
                    // For any other module type, include properties from item if defined
                    ...(item.power !== undefined && { power: item.power }),
                    ...(item.consumption !== undefined && {
                        consumption: item.consumption,
                    }),
                    ...(item.defense !== undefined && {
                        defense: item.defense,
                    }),
                    ...(item.scanRange !== undefined && {
                        scanRange: item.scanRange,
                    }),
                    ...(item.oxygen !== undefined && { oxygen: item.oxygen }),
                    ...(item.capacity !== undefined && {
                        capacity: item.capacity,
                    }),
                };

                // Find the best position for the new module - prefer positions adjacent to existing modules
                const findBestPosition = (
                    module: Module,
                    gridSize: number,
                    existingModules: Module[],
                ): { x: number; y: number } | null => {
                    // Check if this is the first module (no existing modules)
                    if (existingModules.length === 0) {
                        // Place at center of grid
                        const centerPos = Math.floor(gridSize / 2);
                        if (
                            get().canPlaceModule(module, centerPos, centerPos)
                        ) {
                            return { x: centerPos, y: centerPos };
                        }
                    }

                    // Helper: check if position (x,y) is adjacent to any existing module
                    const isAdjacentToExisting = (
                        x: number,
                        y: number,
                        width: number,
                        height: number,
                    ): boolean => {
                        for (const existing of existingModules) {
                            // Check all 4 sides of the new module
                            // Top side (y-1)
                            for (let dx = 0; dx < width; dx++) {
                                if (
                                    y - 1 >= existing.y &&
                                    y - 1 < existing.y + existing.height &&
                                    x + dx >= existing.x &&
                                    x + dx < existing.x + existing.width
                                ) {
                                    return true;
                                }
                            }
                            // Bottom side (y+height)
                            for (let dx = 0; dx < width; dx++) {
                                if (
                                    y + height >= existing.y &&
                                    y + height < existing.y + existing.height &&
                                    x + dx >= existing.x &&
                                    x + dx < existing.x + existing.width
                                ) {
                                    return true;
                                }
                            }
                            // Left side (x-1)
                            for (let dy = 0; dy < height; dy++) {
                                if (
                                    x - 1 >= existing.x &&
                                    x - 1 < existing.x + existing.width &&
                                    y + dy >= existing.y &&
                                    y + dy < existing.y + existing.height
                                ) {
                                    return true;
                                }
                            }
                            // Right side (x+width)
                            for (let dy = 0; dy < height; dy++) {
                                if (
                                    x + width >= existing.x &&
                                    x + width < existing.x + existing.width &&
                                    y + dy >= existing.y &&
                                    y + dy < existing.y + existing.height
                                ) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    };

                    // First pass: find all valid positions that are adjacent to existing modules
                    const adjacentPositions: { x: number; y: number }[] = [];
                    const otherPositions: { x: number; y: number }[] = [];

                    for (let y = 0; y < gridSize; y++) {
                        for (let x = 0; x < gridSize; x++) {
                            if (get().canPlaceModule(module, x, y)) {
                                if (
                                    isAdjacentToExisting(
                                        x,
                                        y,
                                        module.width,
                                        module.height,
                                    )
                                ) {
                                    adjacentPositions.push({ x, y });
                                } else {
                                    otherPositions.push({ x, y });
                                }
                            }
                        }
                    }

                    // Return an adjacent position if available, otherwise any valid position
                    if (adjacentPositions.length > 0) {
                        return adjacentPositions[0];
                    }
                    if (otherPositions.length > 0) {
                        return otherPositions[0];
                    }
                    return null;
                };

                const bestPosition = findBestPosition(
                    newMod,
                    state.ship.gridSize,
                    state.ship.modules,
                );

                if (bestPosition) {
                    newMod.x = bestPosition.x;
                    newMod.y = bestPosition.y;
                    set((s) => ({
                        credits: s.credits - item.price,
                        ship: {
                            ...s.ship,
                            modules: [...s.ship.modules, newMod],
                        },
                        stationInventory: {
                            ...s.stationInventory,
                            [stationId]: { ...inv, [item.id]: bought + 1 },
                        },
                    }));
                    get().addLog(`Установлен: ${item.name}`, "info");
                    // Update fuel capacity if it's a fuel tank
                    if (item.moduleType === "fueltank") {
                        get().updateShipStats();
                    }
                } else {
                    get().addLog("Нет места!", "error");
                    return;
                }
            } else if (item.type === "weapon") {
                const wbays = state.ship.modules.filter(
                    (m) => m.type === "weaponbay",
                );
                if (!wbays.length) {
                    get().addLog("Нет оружейной палубы!", "error");
                    return;
                }
                let installed = false;
                let targetBayId = -1;
                let targetSlotIndex = -1;

                for (const bay of wbays) {
                    if (bay.weapons) {
                        for (let i = 0; i < bay.weapons.length; i++) {
                            if (!bay.weapons[i] && item.weaponType) {
                                targetBayId = bay.id;
                                targetSlotIndex = i;
                                installed = true;
                                break;
                            }
                        }
                    }
                    if (installed) break;
                }

                if (!installed) {
                    get().addLog("Нет слотов!", "error");
                    return;
                }
                const weaponType = item.weaponType;
                if (!weaponType) return;
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === targetBayId && m.weapons
                                ? {
                                      ...m,
                                      weapons: m.weapons.map((w, i) =>
                                          i === targetSlotIndex
                                              ? { type: weaponType }
                                              : w,
                                      ),
                                  }
                                : m,
                        ),
                    },
                    credits: s.credits - item.price,
                    stationInventory: {
                        ...s.stationInventory,
                        [stationId]: {
                            ...inv,
                            [item.id]: bought + 1,
                        },
                    },
                }));
                get().addLog(
                    `Установлено ${WEAPON_TYPES[weaponType].name}`,
                    "info",
                );
            }

            playSound("success");
            get().updateShipStats();
        },

        repairShip: () => {
            if (get().credits < 200) {
                get().addLog("Недостаточно кредитов!", "error");
                return;
            }
            set((s) => ({
                credits: s.credits - 200,
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) => ({
                        ...m,
                        health: m.maxHealth,
                    })),
                },
            }));
            get().addLog("Корабль отремонтирован", "info");
            playSound("success");
            get().updateShipStats();
        },

        healCrew: () => {
            if (get().credits < 150) {
                get().addLog("Недостаточно кредитов!", "error");
                return;
            }
            set((s) => ({
                credits: s.credits - 150,
                crew: s.crew.map((c) => ({
                    ...c,
                    health: c.maxHealth || 100,
                    happiness: Math.min(
                        c.maxHappiness || 100,
                        c.happiness + 20,
                    ),
                })),
            }));
            get().addLog("Экипаж вылечен", "info");
            playSound("success");
        },

        installModuleFromCargo: (cargoIndex, x, y) => {
            const state = get();
            const cargoItem = state.ship.cargo[cargoIndex];

            if (!cargoItem || !cargoItem.isModule || !cargoItem.moduleType) {
                get().addLog("Ошибка: это не модуль!", "error");
                return;
            }

            // Check if position is occupied
            const isOccupied = state.ship.modules.some(
                (m) =>
                    !m.disabled &&
                    m.health > 0 &&
                    Math.abs(m.x - x) < (m.width || 2) &&
                    Math.abs(m.y - y) < (m.height || 2),
            );

            if (isOccupied) {
                get().addLog("Место занято другим модулем!", "error");
                return;
            }

            // Create the module with level from cargo item
            const moduleLevel = cargoItem.moduleLevel || 4;
            const newModule = {
                id: Date.now(),
                type: cargoItem.moduleType,
                name: cargoItem.item,
                level: moduleLevel,
                health: 100,
                maxHealth: 100,
                power: moduleLevel * 5,
                defense: moduleLevel * 3,
                x: x,
                y: y,
                width: 2,
                height: 2,
                color: "#ff00ff33",
                borderColor: "#ff00ff",
                description: `Двигатель уровня ${moduleLevel} - позволяет достичь Тир 4`,
            };

            // Remove from cargo and add to modules
            set((s) => ({
                ship: {
                    ...s.ship,
                    cargo: s.ship.cargo.filter((_, idx) => idx !== cargoIndex),
                    modules: [...s.ship.modules, newModule],
                },
            }));

            get().addLog(
                `✅ Модуль "${cargoItem.item}" установлен на позицию (${x}, ${y})!`,
                "info",
            );
            playSound("success");
            get().updateShipStats();
        },

        buyTradeGood: (goodId, quantity = 5) => {
            const state = get();
            const stationId = state.currentLocation?.stationId;
            if (!stationId) return;

            const pricesFromStation = state.stationPrices[stationId];
            const stockFromStation = state.stationStock[stationId];
            if (!pricesFromStation || !stockFromStation) return;

            const pricePer5 = pricesFromStation[goodId].buy;
            const price = Math.floor(pricePer5 * (quantity / 5));
            const available = stockFromStation[goodId] || 0;

            if (available < quantity) {
                get().addLog("Недостаточно товара на станции!", "error");
                return;
            }
            if (state.credits < price) {
                get().addLog("Недостаточно кредитов!", "error");
                return;
            }

            const cargoModule = state.ship.modules.find(
                (m) => m.type === "cargo" && !m.disabled,
            );
            if (!cargoModule) {
                get().addLog("Склад отключен!", "error");
                return;
            }

            const currentCargo =
                state.ship.cargo.reduce((s, c) => s + c.quantity, 0) +
                state.ship.tradeGoods.reduce((s, g) => s + g.quantity, 0);

            // Вычисляем вместимость с бонусом от сращивания
            const mergeBonus = getMergeEffectsBonus(
                state.crew,
                state.ship.modules,
            );
            let cargoCapacity = cargoModule.capacity || 0;
            if (mergeBonus.cargoCapacity) {
                cargoCapacity = Math.floor(
                    cargoCapacity * (1 + mergeBonus.cargoCapacity / 100),
                );
            }

            if (currentCargo + quantity > cargoCapacity) {
                get().addLog("Недостаточно места!", "error");
                return;
            }

            // const existing = state.ship.tradeGoods.find((g) => g.item === goodId);

            // Update trade goods with proper state management
            set((s) => {
                const existingGood = s.ship.tradeGoods.find(
                    (g) => g.item === goodId,
                );
                if (existingGood) {
                    // Update existing item
                    return {
                        ship: {
                            ...s.ship,
                            tradeGoods: s.ship.tradeGoods.map((g) =>
                                g.item === goodId
                                    ? { ...g, quantity: g.quantity + quantity }
                                    : g,
                            ),
                        },
                    };
                } else {
                    // Add new item
                    return {
                        ship: {
                            ...s.ship,
                            tradeGoods: [
                                ...s.ship.tradeGoods,
                                { item: goodId, quantity, buyPrice: pricePer5 },
                            ],
                        },
                    };
                }
            });

            set((s) => ({
                credits: s.credits - price,
                stationStock: {
                    ...s.stationStock,
                    [stationId]: {
                        ...s.stationStock[stationId],
                        [goodId]: available - quantity,
                    },
                },
            }));
            get().addLog(
                `Куплено: ${TRADE_GOODS[goodId].name} ${quantity}т за ${price}₢`,
                "info",
            );
            playSound("success");
        },

        sellTradeGood: (goodId, quantity = 5) => {
            const state = get();
            const stationId = state.currentLocation?.stationId;
            if (!stationId) return;

            const pricesFromTrade = state.stationPrices[stationId];
            if (!pricesFromTrade) return;

            const playerGood = state.ship.tradeGoods.find(
                (g) => g.item === goodId,
            );
            if (!playerGood || playerGood.quantity < quantity) {
                get().addLog("Недостаточно товара!", "error");
                return;
            }

            const pricePer5 = pricesFromTrade[goodId].sell;
            let price = Math.floor(pricePer5 * (quantity / 5));

            // Apply sellPricePenalty from crew traits (Жадный: -1₢ за каждого юнита)
            let greedyCrewCount = 0;
            state.crew.forEach((c) => {
                c.traits?.forEach((trait) => {
                    if (trait.effect.sellPricePenalty) {
                        greedyCrewCount++;
                    }
                });
            });

            if (greedyCrewCount > 0) {
                const penalty = greedyCrewCount; // -1 credit per greedy crew member
                price = Math.max(0, price - penalty);
                get().addLog(
                    `⚠️ Жадный экипаж (${greedyCrewCount} сущ.): -${penalty}₢ к цене продажи`,
                    "warning",
                );
            }

            // Update trade goods with proper state management
            set((s) => {
                const good = s.ship.tradeGoods.find((g) => g.item === goodId);
                if (!good) return s;

                const newQuantity = good.quantity - quantity;
                if (newQuantity <= 0) {
                    // Remove item if quantity is 0
                    return {
                        ship: {
                            ...s.ship,
                            tradeGoods: s.ship.tradeGoods.filter(
                                (g) => g.item !== goodId,
                            ),
                        },
                    };
                } else {
                    // Update quantity
                    return {
                        ship: {
                            ...s.ship,
                            tradeGoods: s.ship.tradeGoods.map((g) =>
                                g.item === goodId
                                    ? { ...g, quantity: g.quantity - quantity }
                                    : g,
                            ),
                        },
                    };
                }
            });

            set((s) => ({ credits: s.credits + price }));
            get().addLog(
                `Продано: ${TRADE_GOODS[goodId].name} ${quantity}т за ${price}₢`,
                "info",
            );
            playSound("success");
        },

        hireCrew: (crewData, locationId) => {
            // Safeguard against NaN or invalid price
            const price = crewData.price || 0;
            if (isNaN(price) || price < 0) {
                get().addLog("Ошибка: некорректная цена экипажа!", "error");
                return;
            }
            if (get().credits < price) {
                get().addLog("Недостаточно кредитов!", "error");
                return;
            }
            if (get().crew.length >= get().getCrewCapacity()) {
                get().addLog("Нет места!", "error");
                return;
            }
            // Find lifesupport module for initial placement
            const lifesupportModule = get().ship.modules.find(
                (m) => m.type === "lifesupport",
            );
            const initialModuleId =
                lifesupportModule?.id || get().ship.modules[0]?.id || 1;

            // Calculate maxHealth with race bonus and trait effects
            const race = RACES[crewData.race || "human"];
            const healthBonus = race?.crewBonuses?.health || 0;

            // Calculate special traits health penalties (e.g., voidborn -20%)
            let specialHealthPenalty = 0;
            if (race?.specialTraits) {
                race.specialTraits.forEach((trait) => {
                    if (trait.effects.healthPenalty) {
                        specialHealthPenalty += Number(
                            trait.effects.healthPenalty,
                        );
                    }
                });
            }

            // Apply absolute health bonuses
            let baseMaxHealth = 100 + healthBonus;

            // Apply percentage health penalties (e.g., voidborn -20%)
            if (specialHealthPenalty < 0) {
                baseMaxHealth = Math.floor(
                    baseMaxHealth * (1 - Math.abs(specialHealthPenalty)),
                );
            }

            // Apply trait effects to maxHealth
            const traits = crewData.traits || [];
            let maxHappinessBonus = 0;
            traits.forEach((trait) => {
                if (trait.effect.healthPenalty) {
                    // Negative trait: reduce maxHealth by percentage
                    baseMaxHealth = Math.floor(
                        baseMaxHealth * (1 - trait.effect.healthPenalty),
                    );
                }
                if (trait.effect.healthBonus) {
                    // Positive trait: increase maxHealth by percentage
                    baseMaxHealth = Math.floor(
                        baseMaxHealth * (1 + trait.effect.healthBonus),
                    );
                }
                // Legend trait: +50 max happiness
                if (trait.effect.maxHappinessBonus) {
                    maxHappinessBonus += trait.effect.maxHappinessBonus;
                }
            });

            const newCrew: CrewMember = {
                id: Date.now(),
                name:
                    crewData.name ||
                    getRandomName(
                        crewData.profession || "pilot",
                        crewData.race || "human",
                    ),
                race: crewData.race || "human",
                profession: crewData.profession || "pilot",
                level: crewData.level || 1,
                exp: crewData.exp || 0,
                health: baseMaxHealth,
                maxHealth: baseMaxHealth,
                happiness: 80,
                maxHappiness: 100 + maxHappinessBonus, // Default 100, +50 for Legend
                assignment: null,
                assignmentEffect: null,
                combatAssignment: null,
                combatAssignmentEffect: null,
                traits: crewData.traits || [],
                moduleId: crewData.moduleId || initialModuleId,
                movedThisTurn: false,
                turnsAtZeroHappiness: 0,
                isMerged: false,
                mergedModuleId: null,
                firstaidActive: false,
            };

            // Track hired crew by station to prevent re-hiring
            const hiredCrewKey = locationId || "unknown";

            set((s) => ({
                credits: s.credits - price,
                crew: [...s.crew, newCrew],
                hiredCrewFromShips: locationId
                    ? [...s.hiredCrewFromShips, locationId]
                    : s.hiredCrewFromShips,
                hiredCrew: {
                    ...s.hiredCrew,
                    [hiredCrewKey]: [
                        ...(s.hiredCrew[hiredCrewKey] || []),
                        newCrew.name,
                    ],
                },
            }));
            get().addLog(`Нанят: ${newCrew.name} за ${price}₢`, "info");
            playSound("success");
        },

        fireCrewMember: (crewId: number) => {
            const state = get();
            const crewMember = state.crew.find((c) => c.id === crewId);
            if (!crewMember) return;

            // Can't fire the last crew member
            if (state.crew.length <= 1) {
                get().addLog(
                    "Нельзя уволить последнего члена экипажа!",
                    "error",
                );
                return;
            }

            set((s) => ({
                crew: s.crew.filter((c) => c.id !== crewId),
            }));
            get().addLog(`${crewMember.name} уволен`, "warning");
        },

        assignCrewTask: (crewId, task, effect) => {
            const state = get();
            const crewMember = state.crew.find((c) => c.id === crewId);
            if (!crewMember) return;

            // Check if crew member's assignment is valid based on their module position
            const currentModule = state.ship.modules.find(
                (m) => m.id === crewMember.moduleId,
            );
            if (!currentModule) return;

            // Profession-specific module requirements for assignments
            const professionModuleRequirements: Record<string, string[]> = {
                pilot: ["cockpit"], // Pilot assignments only work in cockpit
                engineer: [], // Engineer can work in any module (affects the one they're in)
                medic: [], // Medic can work in any module (affects crew in same module)
                scout: [], // Scout can work anywhere
                scientist: [], // Scientist can work anywhere
            };

            // Check if the assignment is allowed in current module
            if (task) {
                // If not clearing the assignment
                const requiredModules =
                    professionModuleRequirements[crewMember.profession] || [];
                if (
                    requiredModules.length > 0 &&
                    !requiredModules.includes(currentModule.type)
                ) {
                    get().addLog(
                        `${crewMember.profession === "pilot" ? "Пилот" : crewMember.profession} должен быть в ${requiredModules.join(" или ")} для этого задания!`,
                        "error",
                    );
                    return;
                }
            }

            // Update civilian assignment (non-combat)
            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === crewId
                        ? {
                              ...c,
                              assignment: task || null,
                              assignmentEffect: effect || null,
                              // Сброс сращивания при смене задания с "merge"
                              isMerged: task === "merge" ? c.isMerged : false,
                              mergedModuleId:
                                  task === "merge" ? c.mergedModuleId : null,
                          }
                        : c,
                ),
            }));
        },

        assignCombatTask: (crewId, task, effect) => {
            const state = get();
            const crewMember = state.crew.find((c) => c.id === crewId);
            if (!crewMember) return;

            // Update combat assignment
            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === crewId
                        ? {
                              ...c,
                              combatAssignment: task || null,
                              combatAssignmentEffect: effect || null,
                          }
                        : c,
                ),
            }));
        },

        isModuleAdjacent: (moduleId1, moduleId2) => {
            const state = get();
            const mod1 = state.ship.modules.find((m) => m.id === moduleId1);
            const mod2 = state.ship.modules.find((m) => m.id === moduleId2);
            if (!mod1 || !mod2) return false;

            // Two modules are adjacent if they share an edge (not just a corner)
            // Check horizontal adjacency
            if (
                mod1.y < mod2.y + mod2.height &&
                mod1.y + mod1.height > mod2.y
            ) {
                // mod1 is to the left of mod2
                if (mod1.x + mod1.width === mod2.x) return true;
                // mod1 is to the right of mod2
                if (mod2.x + mod2.width === mod1.x) return true;
            }
            // Check vertical adjacency
            if (mod1.x < mod2.x + mod2.width && mod1.x + mod1.width > mod2.x) {
                // mod1 is above mod2
                if (mod1.y + mod1.height === mod2.y) return true;
                // mod1 is below mod2
                if (mod2.y + mod2.height === mod1.y) return true;
            }
            return false;
        },

        getCrewInModule: (moduleId) => {
            const state = get();
            return state.crew.filter((c) => c.moduleId === moduleId);
        },

        moveCrewMember: (crewId, targetModuleId) => {
            const state = get();
            const crewMember = state.crew.find((c) => c.id === crewId);
            if (!crewMember) return;

            // Check if crew member already moved this turn
            if (crewMember.movedThisTurn) {
                get().addLog(
                    `${crewMember.name} уже перемещался в этот ход!`,
                    "error",
                );
                return;
            }

            // Check if target module exists
            const targetModule = state.ship.modules.find(
                (m) => m.id === targetModuleId,
            );
            if (!targetModule) {
                get().addLog("Модуль не найден!", "error");
                return;
            }

            // Check if target module is disabled (manually turned off, not destroyed)
            if (targetModule.manualDisabled) {
                get().addLog(
                    "Нельзя переместиться в отключённый модуль!",
                    "error",
                );
                return;
            }

            // Check if target module is adjacent to current module
            if (!get().isModuleAdjacent(crewMember.moduleId, targetModuleId)) {
                get().addLog(
                    "Модуль не соседний! Можно переместиться только в соседний модуль.",
                    "error",
                );
                return;
            }

            // Move crew member
            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === crewId
                        ? {
                              ...c,
                              moduleId: targetModuleId,
                              movedThisTurn: true,
                              assignment: null,
                              assignmentEffect: null,
                              // Сброс сращивания при перемещении
                              isMerged: false,
                              mergedModuleId: null,
                          }
                        : c,
                ),
            }));

            get().addLog(
                `${crewMember.name} переместился в "${targetModule.name}"`,
                "info",
            );
            playSound("click");
        },

        acceptContract: (contract) => {
            if (get().activeContracts.some((c) => c.id === contract.id)) {
                get().addLog("Уже принят!", "error");
                return;
            }
            if (contract.type === "delivery" && contract.cargo) {
                const cargoKey = contract.cargo as keyof typeof DELIVERY_GOODS;
                const cargoName =
                    DELIVERY_GOODS[cargoKey]?.name || contract.cargo;
                const cargoMod = get().ship.modules.find(
                    (m) => m.type === "cargo",
                );
                if (!cargoMod) {
                    get().addLog("Нет грузового отсека!", "error");
                    return;
                }
                const cur =
                    get().ship.cargo.reduce((s, c) => s + c.quantity, 0) +
                    get().ship.tradeGoods.reduce((s, g) => s + g.quantity, 0);
                if (cargoMod.capacity && cur + 10 > cargoMod.capacity) {
                    get().addLog("Недостаточно места!", "error");
                    return;
                }
                set((s) => ({
                    ship: {
                        ...s.ship,
                        cargo: [
                            ...s.ship.cargo,
                            {
                                item: cargoKey,
                                quantity: 10,
                                contractId: contract.id,
                            },
                        ],
                    },
                }));
                get().addLog(`Загружен: ${cargoName} (10т)`, "info");
            }
            set((s) => ({
                activeContracts: [
                    ...s.activeContracts,
                    { ...contract, acceptedAt: s.turn },
                ],
            }));
            get().addLog(`Задача принята: ${contract.desc}`, "info");
            // Special message for supply_run contracts
            if (contract.type === "supply_run") {
                get().addLog(
                    `📍 Доставить на: ${contract.sourceType === "planet" ? "Планета" : "Корабль"} "${contract.sourceName}" (${contract.sourceSectorName})`,
                    "warning",
                );
            }

            playSound("success");
        },

        completeDeliveryContract: (contractId) => {
            const contract = get().activeContracts.find(
                (c) => c.id === contractId,
            );
            if (!contract) return;
            set((s) => ({
                ship: {
                    ...s.ship,
                    cargo: s.ship.cargo.filter(
                        (c) => c.contractId !== contractId,
                    ),
                },
                credits: s.credits + contract.reward,
                activeContracts: s.activeContracts.filter(
                    (c) => c.id !== contractId,
                ),
                completedContractIds: [...s.completedContractIds, contractId],
            }));
            get().addLog(`Задача выполнена! +${contract.reward}₢`, "info");

            // Give experience to all crew members
            const expReward = CONTRACT_REWARDS.delivery.baseExp;
            giveCrewExperience(
                expReward,
                `Экипаж получил опыт: +${expReward} ед.`,
            );

            playSound("success");
        },

        cancelContract: (contractId) => {
            const contract = get().activeContracts.find(
                (c) => c.id === contractId,
            );
            if (!contract) return;
            if (contract.type === "delivery") {
                set((s) => ({
                    ship: {
                        ...s.ship,
                        cargo: s.ship.cargo.filter(
                            (c) => c.contractId !== contractId,
                        ),
                    },
                }));
            }
            set((s) => ({
                activeContracts: s.activeContracts.filter(
                    (c) => c.id !== contractId,
                ),
            }));
            get().addLog(`Задача отменёна: ${contract.desc}`, "warning");
            playSound("error");
        },

        toggleModule: (moduleId) => {
            const state = get();
            const mod = state.ship.modules.find((m) => m.id === moduleId);
            if (!mod) return;

            const isDisabling = !mod.manualDisabled;

            if (isDisabling) {
                // Manual disable - no damage
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === moduleId
                                ? { ...m, manualDisabled: true }
                                : m,
                        ),
                    },
                }));
                get().addLog(
                    `Модуль "${mod.name}" отключён вручную`,
                    "warning",
                );
            } else {
                // Re-enabling module
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === moduleId
                                ? { ...m, manualDisabled: false }
                                : m,
                        ),
                    },
                }));
                get().addLog(`Модуль "${mod.name}" включён`, "info");

                // Check if we now have enough power to re-enable auto-disabled modules
                const currentPower = get().getTotalPower();
                const currentConsumption = get().getTotalConsumption();
                const autoDisabledModules = get().ship.modules.filter(
                    (m) => m.disabled && m.health > 0,
                );

                if (autoDisabledModules.length > 0) {
                    const powerNeeded = autoDisabledModules.reduce(
                        (sum, m) => sum + (m.consumption || 0),
                        0,
                    );

                    if (currentPower >= currentConsumption + powerNeeded) {
                        // We have enough power to re-enable all auto-disabled modules
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) =>
                                    m.disabled && m.health > 0
                                        ? { ...m, disabled: false }
                                        : m,
                                ),
                            },
                        }));
                        get().addLog(
                            `⚡ Включено модулей: ${autoDisabledModules.length}. Баланс: ${get().getTotalPower() - get().getTotalConsumption()}`,
                            "info",
                        );
                    }
                }
            }
            get().updateShipStats();
        },

        scrapModule: (moduleId) => {
            const state = get();
            const mod = state.ship.modules.find((m) => m.id === moduleId);
            if (!mod) return;

            // Check if any crew member is in this module
            const crewInModule = state.crew.filter(
                (c) => c.moduleId === moduleId,
            );
            if (crewInModule.length > 0) {
                get().addLog(
                    `Нельзя уничтожить модуль "${mod.name}" - в нём находится экипаж (${crewInModule.length} чел.)!`,
                    "error",
                );
                return;
            }

            // Essential modules that must have at least 1
            const essentialTypes = [
                "cockpit",
                "reactor",
                "fueltank",
                "engine",
                "lifesupport",
            ];

            if (essentialTypes.includes(mod.type)) {
                // Count how many of this type exist (excluding disabled ones)
                const sameTypeCount = state.ship.modules.filter(
                    (m) => m.type === mod.type && !m.disabled,
                ).length;

                if (sameTypeCount <= 1) {
                    get().addLog(
                        `Нельзя уничтожить последний ${mod.name}!`,
                        "error",
                    );
                    return;
                }
            }

            // Calculate scrap value (20-40% of module value based on level)
            const basePrices: Record<string, number> = {
                reactor: 450,
                cargo: 350,
                shield: 500,
                scanner: 350,
                lifesupport: 400,
                engine: 500,
                fueltank: 400,
                drill: 350,
                weaponbay: 500,
                medical: 450,
                ai_core: 10000,
            };

            const basePrice = basePrices[mod.type] || 300;
            const levelMultiplier = mod.level || 1;
            const scrapPercent = 0.2 + Math.random() * 0.2; // 20-40%
            const scrapValue = Math.floor(
                basePrice * levelMultiplier * scrapPercent,
            );

            // Remove the module
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.filter((m) => m.id !== moduleId),
                },
                credits: s.credits + scrapValue,
            }));

            get().addLog(
                `♻️ Модуль "${mod.name}" уничтожен. Получено ${scrapValue}₢`,
                "warning",
            );
            get().updateShipStats();
        },

        moveModule: (moduleId, x, y) => {
            const state = get();
            // Check if any module was already moved this turn
            if (state.ship.moduleMovedThisTurn) {
                get().addLog("Модуль уже перемещался в этот ход!", "warning");
                return;
            }

            const mod = state.ship.modules.find((m) => m.id === moduleId);
            if (!mod) return;
            if (get().canPlaceModule(mod, x, y)) {
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === moduleId
                                ? { ...m, x, y, movedThisTurn: true }
                                : m,
                        ),
                        moduleMovedThisTurn: true,
                    },
                }));
                get().addLog(`Модуль ${mod.name} перемещён`, "info");
            } else {
                get().addLog(
                    "Невозможно разместить: нарушена связность",
                    "error",
                );
            }
        },

        canPlaceModule: (module, x, y) => {
            const state = get();
            if (
                x < 0 ||
                y < 0 ||
                x + module.width > state.ship.gridSize ||
                y + module.height > state.ship.gridSize
            ) {
                return false;
            }
            for (const other of state.ship.modules) {
                if (other.id === module.id) continue;
                if (
                    !(
                        x + module.width <= other.x ||
                        x >= other.x + other.width ||
                        y + module.height <= other.y ||
                        y >= other.y + other.height
                    )
                ) {
                    return false;
                }
            }
            if (state.ship.modules.length === 1) return true;
            // Check connectivity
            const tempModules = state.ship.modules.map((m) =>
                m.id === module.id ? { ...m, x, y } : m,
            );
            return areAllModulesConnected(tempModules);
        },

        handleAnomaly: (anomaly) => {
            const reqLevel = anomaly.requiresScientistLevel || 1;
            const scientists = get().crew.filter(
                (c) => c.profession === "scientist",
            );
            const maxScientistLevel =
                scientists.length > 0
                    ? Math.max(...scientists.map((s) => s.level || 1))
                    : 0;

            if (maxScientistLevel < reqLevel) {
                get().addLog(
                    `Аномалия слишком сложна! Требуется учёный уровня ${reqLevel}`,
                    "error",
                );
                return;
            }

            set((s) => ({
                completedLocations: [...s.completedLocations, anomaly.id],
            }));

            // Get research resources from anomaly
            const anomalyResources = getAnomalyResources();
            if (anomalyResources.length > 0) {
                set((s) => ({
                    research: {
                        ...s.research,
                        resources: {
                            ...s.research.resources,
                            ...anomalyResources.reduce(
                                (acc, res) => ({
                                    ...acc,
                                    [res.type]:
                                        (s.research.resources[
                                            res.type as keyof typeof s.research.resources
                                        ] || 0) + res.quantity,
                                }),
                                {},
                            ),
                        },
                    },
                }));
                anomalyResources.forEach((res) => {
                    if (res.quantity > 0) {
                        get().addLog(
                            `🔬 Найдены исследовательские ресурсы: ${RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].icon} ${RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].name} x${res.quantity}`,
                            "info",
                        );
                    }
                });
            }

            // Apply science bonus for experience gain (crystalline: +35%)
            scientists.forEach((s) => {
                const scientistRace = RACES[s.race];
                let expGain = reqLevel * 15;
                let scienceBonus = 0;
                if (scientistRace?.crewBonuses.science) {
                    scienceBonus = Math.max(
                        scienceBonus,
                        scientistRace.crewBonuses.science,
                    );
                }
                if (scienceBonus > 0) {
                    expGain = Math.floor(expGain * (1 + scienceBonus));
                }
                get().gainExp(s, expGain);
            });

            // Check research contract (can be completed in any sector)
            const researchContract = get().activeContracts.find(
                (c) => c.type === "research",
            );
            if (researchContract) {
                set((s) => {
                    const updated = s.activeContracts.map((c) =>
                        c.id === researchContract.id
                            ? {
                                  ...c,
                                  visitedAnomalies:
                                      (c.visitedAnomalies || 0) + 1,
                              }
                            : c,
                    );
                    // Check if contract is completed
                    const updatedContract = updated.find(
                        (c) => c.id === researchContract.id,
                    );
                    if (
                        updatedContract &&
                        updatedContract.visitedAnomalies !== undefined &&
                        updatedContract.requiresAnomalies !== undefined &&
                        updatedContract.visitedAnomalies >=
                            updatedContract.requiresAnomalies
                    ) {
                        // Complete the contract
                        return {
                            activeContracts: s.activeContracts.filter(
                                (ac) => ac.id !== researchContract.id,
                            ),
                            completedContractIds: [
                                ...s.completedContractIds,
                                researchContract.id,
                            ],
                            credits: s.credits + (researchContract.reward || 0),
                        };
                    }
                    return { activeContracts: updated };
                });
                get().addLog(
                    `Исследование: ${(researchContract.visitedAnomalies || 0) + 1}/${researchContract.requiresAnomalies} аномалий`,
                    "info",
                );
                // Check if contract was completed and show completion message
                const updatedContract = get().activeContracts.find(
                    (c) => c.id === researchContract.id,
                );
                if (!updatedContract) {
                    get().addLog(
                        `Задача "${researchContract.desc}" выполнен! +${researchContract.reward}₢`,
                        "info",
                    );

                    // Give experience to all crew members
                    const expReward = CONTRACT_REWARDS.research.baseExp;
                    giveCrewExperience(
                        expReward,
                        `Экипаж получил опыт: +${expReward} ед.`,
                    );
                }
            }

            // Calculate science bonus for reward (crystalline: +35%)
            let scienceBonus = 0;
            scientists.forEach((s) => {
                const scientistRace = RACES[s.race];
                let raceScienceBonus = 0;
                if (scientistRace?.crewBonuses.science) {
                    raceScienceBonus = Math.max(
                        raceScienceBonus,
                        scientistRace.crewBonuses.science,
                    );
                }
                scienceBonus = Math.max(scienceBonus, raceScienceBonus);
            });

            // Anomalies give better rewards (require scientists)
            const baseReward = reqLevel * 120;
            const rewardMultiplier = 1 + scienceBonus;
            if (anomaly.anomalyType === "good") {
                const reward = Math.floor(
                    (baseReward + Math.floor(Math.random() * 180)) *
                        rewardMultiplier,
                );
                set((s) => ({ credits: s.credits + reward }));
                get().addLog(
                    `Аномалия: +${reward}₢${scienceBonus > 0 ? ` (бонус науки: +${Math.round(scienceBonus * 100)}%)` : ""}`,
                    "info",
                );
            } else {
                const damage = reqLevel * 10 + Math.floor(Math.random() * 20);
                const randomModule =
                    get().ship.modules[
                        Math.floor(Math.random() * get().ship.modules.length)
                    ];
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === randomModule.id
                                ? {
                                      ...m,
                                      health: Math.max(10, m.health - damage),
                                  }
                                : m,
                        ),
                    },
                }));
                get().addLog(
                    `Аномалия: "${randomModule.name}" -${damage}%`,
                    "warning",
                );
            }

            // DON'T close the panel - let player see results and click "Leave"
            get().updateShipStats();
        },

        sendScoutingMission: (planetId) => {
            const state = get();
            const scout = state.crew.find((c) => c.profession === "scout");
            if (!scout) {
                get().addLog("Нет разведчика!", "error");
                return;
            }

            // Instant scouting - resolve immediately (takes 1 turn)
            const outcome = Math.random();
            let resultType: "credits" | "tradeGood" | "nothing" | "enemy" =
                "nothing";
            let resultValue: number | undefined;
            let resultItemName: string | undefined;

            get().gainExp(scout, 12);

            if (outcome < 0.4) {
                const reward = 100 + Math.floor(Math.random() * 150);
                set((s) => ({ credits: s.credits + reward }));
                get().addLog(
                    `Разведка: ${scout.name} нашёл ресурсы! +${reward}₢`,
                    "info",
                );
                resultType = "credits";
                resultValue = reward;
            } else if (outcome < 0.7) {
                const keys = typedKeys(TRADE_GOODS);
                const goodId = keys[Math.floor(Math.random() * keys.length)];
                set((s) => ({
                    ship: {
                        ...s.ship,
                        tradeGoods: [
                            ...s.ship.tradeGoods,
                            { item: goodId, quantity: 5, buyPrice: 0 },
                        ],
                    },
                }));
                get().addLog(
                    `Разведка: ${scout.name} нашёл ${TRADE_GOODS[goodId].name}!`,
                    "info",
                );
                resultType = "tradeGood";
                resultItemName = TRADE_GOODS[goodId].name;
            } else {
                get().addLog(`Разведка: ${scout.name} ничего не нашёл`, "info");
                resultType = "nothing";
            }

            // Update scoutedTimes on the planet location
            const planet = state.currentSector?.locations.find(
                (l) => l.id === planetId,
            );
            const newScoutedTimes = (planet?.scoutedTimes || 0) + 1;
            const isFullyExplored = newScoutedTimes >= 3;

            set((s) => ({
                turn: s.turn + 1,
                currentSector: s.currentSector
                    ? {
                          ...s.currentSector,
                          locations: s.currentSector.locations.map((loc) =>
                              loc.id === planetId
                                  ? {
                                        ...loc,
                                        scoutedTimes: newScoutedTimes,
                                        explored: isFullyExplored,
                                        lastScoutResult: {
                                            type: resultType,
                                            value: resultValue,
                                            itemName: resultItemName,
                                        },
                                    }
                                  : loc,
                          ),
                      }
                    : null,
                currentLocation:
                    s.currentLocation?.id === planetId
                        ? {
                              ...s.currentLocation,
                              scoutedTimes: newScoutedTimes,
                              explored: isFullyExplored,
                              lastScoutResult: {
                                  type: resultType,
                                  value: resultValue,
                                  itemName: resultItemName,
                              },
                          }
                        : s.currentLocation,
            }));

            get().addLog(`Разведка завершена: ${newScoutedTimes}/3`, "info");
            get().updateShipStats();
        },

        // Distress Signal Handler
        respondToDistressSignal: () => {
            const state = get();
            const loc = state.currentLocation;
            const sector = state.currentSector;

            if (!loc || loc.type !== "distress_signal" || !sector) {
                get().addLog("Это не сигнал бедствия!", "error");
                return;
            }

            if (loc.signalResolved) {
                get().addLog("Сигнал уже обработан!", "warning");
                return;
            }

            // Use existing signalType if revealed by scanner, otherwise determine random outcome
            // Eye of Singularity increases ambush chance by 50%
            const allSeeing = state.artifacts.find(
                (a) => a.effect.type === "all_seeing" && a.effect.active,
            );
            const ambushModifier = allSeeing ? 0.5 : 0;
            const outcome =
                loc.signalType || determineSignalOutcome(ambushModifier);

            // Update both currentLocation AND the location in the sector
            const updatedLocation = {
                ...loc,
                signalType: outcome,
                signalResolved: true,
            };

            set((s) => {
                const updatedSector = s.currentSector
                    ? {
                          ...s.currentSector,
                          locations: s.currentSector.locations.map((l) =>
                              l.id === loc.id ? updatedLocation : l,
                          ),
                      }
                    : null;

                return {
                    currentLocation: updatedLocation,
                    currentSector: updatedSector,
                    galaxy: {
                        ...s.galaxy,
                        sectors: s.galaxy.sectors.map((sec) =>
                            sec.id === sector.id && updatedSector
                                ? updatedSector
                                : sec,
                        ),
                    },
                };
            });

            playSound("combat");

            switch (outcome) {
                case "pirate_ambush": {
                    get().addLog("🚨 ЗАСАДА! Это пираты!", "error");
                    // Start combat with ambush - enemy attacks first
                    get().startCombat(
                        {
                            ...loc,
                            type: "enemy",
                            name: "Пираты",
                            threat: Math.min(
                                3,
                                (state.currentSector?.tier ?? 1) + 1,
                            ),
                        },
                        true,
                    ); // isAmbush = true - pirates attack first
                    break;
                }
                case "survivors": {
                    const reward = 50 + Math.floor(Math.random() * 50); // 50-100 credits
                    const hasCapacity =
                        state.crew.length < get().getCrewCapacity();

                    // Add survivor capsule to cargo instead of immediate reward
                    set((s) => ({
                        ship: {
                            ...s.ship,
                            cargo: [
                                ...s.ship.cargo,
                                {
                                    item: "Капсула с выжившими",
                                    quantity: 1,
                                    rewardValue: reward, // Store reward value for later
                                },
                            ],
                        },
                    }));

                    get().addLog("✓ Выжившие спасены!", "info");
                    get().addLog(
                        `Капсула с выжившими добавлена в трюм. Награда: ${reward}₢ при доставке.`,
                        "info",
                    );

                    if (hasCapacity && Math.random() < 0.3) {
                        // Sometimes a survivor joins the crew
                        const professions = [
                            "pilot",
                            "engineer",
                            "medic",
                            "scout",
                            "scientist",
                        ] as const;
                        const newProfession =
                            professions[
                                Math.floor(Math.random() * professions.length)
                            ];
                        // Find lifesupport module for initial placement
                        const lifesupportModule = get().ship.modules.find(
                            (m) => m.type === "lifesupport",
                        );
                        const initialModuleId =
                            lifesupportModule?.id ||
                            get().ship.modules[0]?.id ||
                            1;

                        const newCrew: CrewMember = {
                            id: Date.now(),
                            name: getRandomName(newProfession, "human"),
                            race: "human",
                            profession: newProfession,
                            level: 1,
                            exp: 0,
                            health: 100,
                            maxHealth: 100,
                            happiness: 100,
                            maxHappiness: 100,
                            assignment: null,
                            assignmentEffect: null,
                            combatAssignment: null,
                            combatAssignmentEffect: null,
                            traits: [],
                            moduleId: initialModuleId,
                            movedThisTurn: false,
                            turnsAtZeroHappiness: 0,
                            isMerged: false,
                            mergedModuleId: null,
                            firstaidActive: false,
                        };
                        set((s) => ({ crew: [...s.crew, newCrew] }));
                        get().addLog(
                            `Выживший ${newCrew.name} присоединился к команде!`,
                            "info",
                        );
                    }

                    // Mark as completed but DON'T close the panel - let player see result
                    set((s) => ({
                        completedLocations: [...s.completedLocations, loc.id],
                    }));
                    // Stay in distress_signal mode to show result
                    break;
                }
                case "abandoned_cargo": {
                    const creditsReward = 50 + Math.floor(Math.random() * 50); // 50-100 credits
                    const keys = typedKeys(TRADE_GOODS);
                    const goodId =
                        keys[Math.floor(Math.random() * keys.length)];
                    const quantity = 5 + Math.floor(Math.random() * 10);
                    const goodName = TRADE_GOODS[goodId].name;

                    set((s) => ({
                        credits: s.credits + creditsReward,
                        ship: {
                            ...s.ship,
                            tradeGoods: [
                                ...s.ship.tradeGoods,
                                { item: goodId, quantity, buyPrice: 0 },
                            ],
                        },
                    }));

                    get().addLog("📦 Найден заброшенный груз!", "info");
                    get().addLog(`Кредиты: +${creditsReward}₢`, "info");
                    get().addLog(`${goodName}: +${quantity}`, "info");

                    // Chance to find artifact
                    const artifact = get().tryFindArtifact();
                    let foundArtifact: string | undefined;
                    if (artifact) {
                        get().addLog(
                            `★ АРТЕФАКТ НАЙДЕН: ${artifact.name}!`,
                            "info",
                        );
                        foundArtifact = artifact.name;
                    }

                    // Store loot details for display
                    const updatedLocationForDisplay = {
                        ...loc,
                        signalType: outcome,
                        signalResolved: true,
                        signalLoot: {
                            credits: creditsReward,
                            tradeGood: { name: goodName, quantity },
                            artifact: foundArtifact,
                        },
                    };

                    set((s) => {
                        const updatedSector = s.currentSector
                            ? {
                                  ...s.currentSector,
                                  locations: s.currentSector.locations.map(
                                      (l) =>
                                          l.id === loc.id
                                              ? updatedLocationForDisplay
                                              : l,
                                  ),
                              }
                            : null;

                        return {
                            currentLocation: updatedLocationForDisplay,
                            currentSector: updatedSector,
                            galaxy: {
                                ...s.galaxy,
                                sectors: s.galaxy.sectors.map((sec) =>
                                    sec.id === sector.id && updatedSector
                                        ? updatedSector
                                        : sec,
                                ),
                            },
                        };
                    });

                    // Mark as completed but DON'T close the panel - let player see result
                    set((s) => ({
                        completedLocations: [...s.completedLocations, loc.id],
                    }));
                    // Stay in distress_signal mode to show result
                    break;
                }
            }

            get().nextTurn();
        },

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

        showArtifacts: () => {
            set((state) => ({
                // Don't overwrite previousGameMode if we're already in a panel mode
                previousGameMode:
                    state.gameMode === "research" ||
                    state.gameMode === "artifacts"
                        ? state.previousGameMode
                        : state.gameMode,
                gameMode: "artifacts",
            }));
        },

        showResearch: () => {
            set((state) => ({
                // Don't overwrite previousGameMode if we're already in a panel mode
                previousGameMode:
                    state.gameMode === "research" ||
                    state.gameMode === "artifacts"
                        ? state.previousGameMode
                        : state.gameMode,
                gameMode: "research",
            }));
        },

        // Save previous game mode for mobile modal (without changing current game mode)
        savePreviousGameMode: () => {
            set((state) => ({
                previousGameMode:
                    state.gameMode === "research" ||
                    state.gameMode === "artifacts"
                        ? state.previousGameMode
                        : state.gameMode,
            }));
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
