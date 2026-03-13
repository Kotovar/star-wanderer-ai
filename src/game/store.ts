import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
    getArtifactEffectValue,
    getRandomUndiscoveredArtifact,
} from "@/game/artifacts";
import { isModuleActive } from "@/game/modules";
import {
    CONTRACT_REWARDS,
    DELIVERY_GOODS,
    PLANET_SPECIALIZATIONS,
    RACES,
    RESEARCH_TREE,
    TRADE_GOODS,
    RESEARCH_RESOURCES,
} from "@/game/constants";
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
import { getAdjacentTechs, getAnomalyResources } from "@/game/research/utils";
import {
    createLogSlice,
    createShipSlice,
    createScannerSlice,
    createCrewSlice,
    createGameLoopSlice,
    createScanContractsSlice,
    createCombatSlice,
    createTravelSlice,
    createLocationsSlice,
    createUiSlice,
    createShopSlice,
    createServicesSlice,
} from "@/game/slices";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import type { CrewMember, GameStore, RaceId } from "@/game/types";

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
        ...createLocationsSlice(set, get),
        ...createUiSlice(set),
        ...createShopSlice(set, get),
        ...createServicesSlice(set, get),

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
