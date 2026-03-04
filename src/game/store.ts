import { create } from "zustand";
import type {
    GameState,
    Location,
    Contract,
    Module,
    CrewMember,
    ShopItem,
    Artifact,
    EnemyModule,
    RaceId,
    BattleResult,
    CargoItem,
    Goods,
    ShipMergeTrait,
    CrewMemberAssignment,
    CrewMemberCombatAssignment,
} from "@/game/types";
import {
    CONTRACT_REWARDS,
    TRADE_GOODS,
    WEAPON_TYPES,
    DELIVERY_GOODS,
} from "@/game/constants";
import { generateGalaxy } from "@/game/galaxy";
import { RACES } from "@/game/constants/races";
import { CREW_TRAITS } from "@/game/constants/crew";
import { PLANET_SPECIALIZATIONS } from "@/game/constants/planets";
import { getRandomName, giveCrewExperience } from "@/game/crew/utils";
import {
    getMutationTraitDesc,
    getMutationTraitName,
} from "@/game/traits/utils";
import { MUTATION_TRAITS } from "@/game/traits/consts";
import { getRandomUndiscoveredArtifact } from "@/game/artifacts/utils";
import { getBossById } from "@/game/bosses/utils";
import { determineSignalOutcome } from "@/game/signals/utils";
import { typedKeys } from "@/lib/utils";
import { initializeStationData } from "@/game/stations";
import { MODULES_BY_LEVEL } from "@/game/components/station/station-data";
import { initialState } from "./initial";
import { getActiveAssignment } from "./crew";
import { playSound } from "@/sounds";
import {
    clearLocalStorage,
    loadFromLocalStorage,
    saveToLocalStorage,
} from "./saves/utils";
import { handleSurvivorCapsuleDelivery } from "./contracts/handleSurvivorCapsuleDelivery";
import { areAllModulesConnected } from "./modules";

// ═══════════════════════════════════════════════════════════════
// Power management constants
// ═══════════════════════════════════════════════════════════════
const EMERGENCY_SHUTDOWN_DAMAGE = 0.1; // 10% урона модулю, когда он аварийно выключен из-за отсутствия энергии

import {
    getMiningResources,
    getCombatLootResources,
    getBossLootResources,
    getAnomalyResources,
} from "./research/utils";
import { RESEARCH_RESOURCES } from "./constants/research";

// Helper function to get artifact effect value with active boost bonus
const getArtifactEffectValue = (
    artifact: Artifact | undefined,
    state: GameState,
): number => {
    if (!artifact) return 0;

    let value = artifact.effect.value || 0;

    // Check if this artifact is boosted by voidborn ritual
    const boostEffect = state.activeEffects.find(
        (e) =>
            e.effects.some((ef) => ef.type === "artifact_boost") &&
            e.targetArtifactId === artifact.id,
    );

    if (boostEffect) {
        const boostValue =
            (boostEffect.effects.find((ef) => ef.type === "artifact_boost")
                ?.value as number) ?? 0.5;
        // For percentage values (< 1), don't use floor - keep decimal precision
        // For integer values (>= 1), use floor for clean numbers
        value =
            value < 1
                ? value * (1 + boostValue)
                : Math.floor(value * (1 + boostValue));
    }

    return value;
};

// Game store
export const useGameStore = create<
    GameState & {
        // Actions
        addLog: (
            message: string,
            type?: "info" | "warning" | "error" | "combat",
        ) => void;
        updateShipStats: () => void;
        getTotalPower: () => number;
        getTotalConsumption: () => number;
        getTotalDamage: () => {
            total: number;
            kinetic: number;
            laser: number;
            missile: number;
        };
        getCrewCapacity: () => number;
        getFuelCapacity: () => number;
        getFuelEfficiency: () => number;
        getDrillLevel: () => number;
        getCargoCapacity: () => number;
        getScanLevel: () => number;
        getScanRange: () => number;
        calculateFuelCost: (targetTier: number) => number;
        areEnginesFunctional: () => boolean;
        areFuelTanksFunctional: () => boolean;
        refuel: (amount: number, price: number) => void;
        gainExp: (crewMember: CrewMember | undefined, amount: number) => void;

        // Game actions
        nextTurn: () => void;
        skipTurn: () => void;
        selectSector: (sectorId: number) => void;
        selectLocation: (locationIdx: number) => void;
        travelThroughBlackHole: () => void;
        mineAsteroid: () => void;
        enterStorm: () => void;

        // Mode changes
        showGalaxyMap: () => void;
        showSectorMap: () => void;
        showAssignments: () => void;
        closeArtifactsPanel: () => void;

        // Combat
        startCombat: (enemy: Location, isAmbush?: boolean) => void;
        startBossCombat: (bossLocation: Location) => void;
        selectEnemyModule: (moduleId: number) => void;
        attackEnemy: () => void;
        executeAmbushAttack: () => void; // Execute enemy attack for ambush (first strike)
        retreat: () => void;

        // Station/Planet
        buyItem: (item: ShopItem, targetModuleId?: number) => void;
        repairShip: () => void;
        healCrew: () => void;
        buyTradeGood: (goodId: Goods, quantity?: number) => void;
        sellTradeGood: (goodId: Goods, quantity?: number) => void;
        installModuleFromCargo: (
            cargoIndex: number,
            x: number,
            y: number,
        ) => void;

        // Crew
        hireCrew: (
            crewData: Partial<CrewMember> & { price: number },
            locationId?: string,
        ) => void;
        fireCrewMember: (crewId: number) => void;
        assignCrewTask: (
            crewId: number,
            task: CrewMemberAssignment,
            effect: string | null,
        ) => void;
        assignCombatTask: (
            crewId: number,
            task: CrewMemberCombatAssignment,
            effect: string,
        ) => void;
        moveCrewMember: (crewId: number, targetModuleId: number) => void;
        isModuleAdjacent: (moduleId1: number, moduleId2: number) => boolean;
        getCrewInModule: (moduleId: number) => CrewMember[];

        // Contracts
        acceptContract: (contract: Contract) => void;
        completeDeliveryContract: (contractId: string) => void;
        cancelContract: (contractId: string) => void;

        // Module
        toggleModule: (moduleId: number) => void;
        scrapModule: (moduleId: number) => void;
        moveModule: (moduleId: number, x: number, y: number) => void;
        canPlaceModule: (module: Module, x: number, y: number) => boolean;

        // Anomaly
        handleAnomaly: (anomaly: Location) => void;

        // Scouting
        sendScoutingMission: (planetId: string) => void;

        // Distress Signal
        respondToDistressSignal: () => void;

        // Artifacts
        researchArtifact: (artifactId: string) => void;
        toggleArtifact: (artifactId: string) => void;
        tryFindArtifact: () => Artifact | null;
        showArtifacts: () => void;
        showResearch: () => void;

        // Races
        discoverRace: (raceId: RaceId) => void;

        // Planet Specializations
        trainCrew: (crewMemberId: number) => void;
        scanSector: () => void;
        boostArtifact: (artifactId: string) => void;
        activatePlanetEffect: (raceId: RaceId, planetId?: string) => void;
        removeExpiredEffects: () => void;

        // Game Over
        checkGameOver: () => void;

        // Victory
        triggerVictory: () => void;

        // Research
        startResearch: (techId: string) => void;
        addResearchResource: (type: string, quantity: number) => void;
        processResearch: () => void;

        // Game Management
        restartGame: () => void;
        saveGame: () => void;
        loadGame: () => boolean;
    }
>((set, get) => ({
    ...initialState,

    addLog: (message, type = "info") => {
        set((state) => ({
            log: [{ message, type, turn: state.turn }, ...state.log].slice(
                0,
                100,
            ),
        }));
    },

    updateShipStats: () => {
        set((state) => {
            // Total hull health (sum of all module health)
            // const totalHealth = state.ship.modules.reduce(
            //     (sum, m) => sum + (m.maxHealth || m.health),
            //     0,
            // );
            // Total defense (sum of all module defense values)
            let totalDefense = state.ship.modules.reduce(
                (sum, m) => sum + (m.defense || 0),
                0,
            );

            let totalShields = state.ship.modules
                .filter((m) => m.type === "shield")
                .reduce((sum, m) => sum + (m.shields || 0), 0);

            // Dark Shield artifact bonus
            const darkShield = state.artifacts.find(
                (a) => a.effect.type === "dark_shield" && a.effect.active,
            );
            if (darkShield) {
                totalShields += getArtifactEffectValue(darkShield, state);
            }

            // Crystalline Armor artifact bonus (+X defense to all modules)
            const crystallineArmor = state.artifacts.find(
                (a) => a.effect.type === "module_armor" && a.effect.active,
            );
            if (crystallineArmor) {
                const armorBonus = getArtifactEffectValue(
                    crystallineArmor,
                    state,
                );
                totalDefense += state.ship.modules.length * armorBonus;
            }

            const totalOxygen = state.ship.modules
                .filter((m) => m.type === "lifesupport")
                .reduce((sum, m) => sum + (m.oxygen || 0), 0);
            const totalFuelCapacity = state.ship.modules
                .filter(
                    (m) => m.type === "fueltank" && !m.disabled && m.health > 0,
                )
                .reduce((sum, m) => sum + (m.capacity || 0), 0);

            // Safeguard against NaN or undefined fuel
            const currentFuel = state.ship.fuel || 0;

            // Preserve bonus shields from planet effects
            const bonusShields = state.ship.bonusShields || 0;
            const maxShieldsWithBonus = totalShields + bonusShields;

            return {
                ship: {
                    ...state.ship,
                    armor: totalDefense, // Use total defense as armor value
                    maxShields: maxShieldsWithBonus,
                    shields: Math.min(state.ship.shields, maxShieldsWithBonus),
                    crewCapacity: totalOxygen,
                    maxFuel: totalFuelCapacity,
                    fuel: Math.min(currentFuel, totalFuelCapacity),
                },
            };
        });
    },

    getTotalPower: () => {
        const state = get();
        let power = state.ship.modules
            .filter((m) => !m.disabled)
            .reduce((sum, m) => sum + (m.power || 0), 0);

        // Engineer power boost assignment (+5 power)
        const powerBoost = state.crew.find((c) => c.assignment === "power")
            ? 5
            : 0;
        power += powerBoost;

        // Abyss Reactor artifact bonus (+25 power)
        const abyssReactor = state.artifacts.find(
            (a) => a.effect.type === "abyss_power" && a.effect.active,
        );
        if (abyssReactor) {
            power += getArtifactEffectValue(abyssReactor, state);
        }

        // Eternal Reactor Core artifact bonus (+10 free power)
        const eternalReactor = state.artifacts.find(
            (a) => a.effect.type === "free_power" && a.effect.active,
        );
        if (eternalReactor) {
            power += getArtifactEffectValue(eternalReactor, state);
        }

        // Planet effect bonus power
        const bonusPower = state.ship.bonusPower || 0;
        power += bonusPower;

        return power;
    },

    getTotalConsumption: () => {
        const state = get();
        const pilotRed = state.crew.find((c) => c.assignment === "navigation")
            ? 1
            : 0;

        // Calculate energy consumption per module, applying crew bonuses locally
        let base = 0;
        state.ship.modules.forEach((m) => {
            if (m.disabled) return;

            let moduleConsumption = m.consumption || 0;

            // Find crew in this module and apply their energy bonuses
            const crewInModule = state.crew.filter((c) => c.moduleId === m.id);
            crewInModule.forEach((c) => {
                const race = RACES[c.race];
                if (race?.crewBonuses.energy && race.crewBonuses.energy < 0) {
                    // Negative energy bonus means reduced consumption (xenosymbiont: -25%)
                    moduleConsumption = Math.floor(
                        moduleConsumption * (1 + race.crewBonuses.energy),
                    );
                }
            });

            base += moduleConsumption;
        });

        return Math.max(0, base - pilotRed);
    },

    getTotalDamage: () => {
        const state = get();
        const dmg = { total: 0, kinetic: 0, laser: 0, missile: 0 };
        state.ship.modules.forEach((m) => {
            if (m.disabled) return;
            if (m.type === "weaponbay" && m.weapons) {
                m.weapons.forEach((w) => {
                    if (w) {
                        const weaponType = WEAPON_TYPES[w.type];
                        const weaponDamage = weaponType.damage;

                        // Laser bonus: +20% damage to shields (calculated in combat)
                        // For display, show base damage
                        dmg.total += weaponDamage;
                        dmg[w.type] += weaponDamage;
                    }
                });
            }
        });

        // Apply race combat bonuses (krylorian: +35% combat)
        let combatBonus = 0;
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.crewBonuses.combat) {
                combatBonus = Math.max(combatBonus, race.crewBonuses.combat);
            }
        });
        if (combatBonus > 0) {
            dmg.total = Math.floor(dmg.total * (1 + combatBonus));
        }

        // Apply crew traits damageBonus (e.g., "Меткий стрелок": +10% damage)
        let traitDamageBonus = 0;
        state.crew.forEach((c) => {
            c.traits?.forEach((trait) => {
                if (trait.effect?.damageBonus) {
                    traitDamageBonus = Math.max(
                        traitDamageBonus,
                        trait.effect.damageBonus as number,
                    );
                }
            });
        });
        if (traitDamageBonus > 0) {
            dmg.total = Math.floor(dmg.total * (1 + traitDamageBonus));
        }

        // Apply plasma_injector artifact bonus (+30% damage)
        const plasmaInjector = state.artifacts.find(
            (a) => a.effect.type === "damage_boost" && a.effect.active,
        );
        if (plasmaInjector) {
            const boostValue = getArtifactEffectValue(plasmaInjector, state);
            dmg.total = Math.floor(dmg.total * (1 + boostValue));
        }

        // Apply weapon damage technology bonuses
        const weaponDamageTechs = state.research.researchedTechs.filter(
            (techId) => {
                const tech = RESEARCH_TREE[techId];
                return tech.bonuses.some((b) => b.type === "weapon_damage");
            },
        );
        let techDamageBonus = 0;
        weaponDamageTechs.forEach((techId) => {
            const tech = RESEARCH_TREE[techId];
            tech.bonuses.forEach((bonus) => {
                if (bonus.type === "weapon_damage") {
                    techDamageBonus = Math.max(techDamageBonus, bonus.value);
                }
            });
        });
        if (techDamageBonus > 0) {
            dmg.total = Math.floor(dmg.total * (1 + techDamageBonus));
        }

        // Apply crystalline artifactBonus (+15% to artifact effects)
        let artifactBonus = 0;
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.specialTraits) {
                const trait = race.specialTraits.find(
                    (t) => t.id === "resonance" && t.effects.artifactBonus,
                );
                if (trait) {
                    artifactBonus = Math.max(
                        artifactBonus,
                        trait.effects.artifactBonus as number,
                    );
                }
            }
        });

        return dmg;
    },

    getCrewCapacity: () => {
        const state = get();
        const lifesupport = state.ship.modules.filter(
            (m) => m.type === "lifesupport" && !m.disabled,
        );
        return lifesupport.reduce((sum, m) => sum + (m.oxygen || 0), 0);
    },

    getFuelCapacity: () => {
        const state = get();
        return state.ship.modules
            .filter((m) => m.type === "fueltank" && !m.disabled && m.health > 0)
            .reduce((sum, m) => sum + (m.capacity || 0), 0);
    },

    getFuelEfficiency: () => {
        const state = get();
        const engines = state.ship.modules.filter(
            (m) => m.type === "engine" && !m.disabled && m.health > 0,
        );
        if (engines.length === 0) return 20; // Default inefficient
        // Use the best (lowest) fuel efficiency
        return Math.min(...engines.map((e) => e.fuelEfficiency || 10));
    },

    getDrillLevel: () => {
        const state = get();
        const drills = state.ship.modules.filter(
            (m) => m.type === "drill" && !m.disabled && m.health > 0,
        );
        if (drills.length === 0) return 0;
        // Return the highest level drill
        return Math.max(...drills.map((d) => d.level || 1));
    },

    getCargoCapacity: () => {
        const state = get();
        const cargoModules = state.ship.modules.filter(
            (m) => m.type === "cargo" && !m.disabled && m.health > 0,
        );
        return cargoModules.reduce((sum, m) => sum + (m.capacity || 40), 0);
    },

    getScanLevel: () => {
        const state = get();
        const scanners = state.ship.modules.filter(
            (m) => m.type === "scanner" && !m.disabled && m.health > 0,
        );

        // Apply all_seeing artifact (Eye of Singularity) - acts as scanner level 3
        // This works even without a scanner module
        const allSeeing = state.artifacts.find(
            (a) => a.effect.type === "all_seeing" && a.effect.active,
        );
        if (allSeeing) {
            return 3; // Eye of Singularity gives scanner level 3
        }

        if (scanners.length === 0) return 0;
        // Return the scanner level (1-4) based on scanRange
        let maxRange = Math.max(...scanners.map((s) => s.scanRange || 0));

        // Apply crystalline artifactBonus (+15% to artifact effects)
        let artifactBonus = 0;
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.specialTraits) {
                const trait = race.specialTraits.find(
                    (t) => t.id === "resonance" && t.effects.artifactBonus,
                );
                if (trait) {
                    artifactBonus = Math.max(
                        artifactBonus,
                        trait.effects.artifactBonus as number,
                    );
                }
            }
        });
        if (artifactBonus > 0) {
            maxRange = Math.floor(maxRange * (1 + artifactBonus));
        }

        if (maxRange >= 15) return 4; // Quantum scanner
        if (maxRange >= 8) return 3; // Scanner MK-3
        if (maxRange >= 5) return 2; // Scanner MK-2
        if (maxRange >= 3) return 1; // Scanner MK-1
        return 0;
    },

    getScanRange: () => {
        const state = get();
        const scanners = state.ship.modules.filter(
            (m) => m.type === "scanner" && !m.disabled && m.health > 0,
        );
        if (scanners.length === 0) return 0;
        // Return the numeric scanRange value with all bonuses
        let maxRange = Math.max(...scanners.map((s) => s.scanRange || 0));

        // Apply quantum_scanner artifact bonus (+5 scan range) - requires scanner module
        const quantumScanner = state.artifacts.find(
            (a) => a.effect.type === "quantum_scan" && a.effect.active,
        );
        if (quantumScanner && scanners.length > 0) {
            maxRange += getArtifactEffectValue(quantumScanner, state);
        }

        // Apply scan range technology bonuses
        const scanRangeTechs = state.research.researchedTechs.filter(
            (techId) => {
                const tech = RESEARCH_TREE[techId];
                return tech.bonuses.some((b) => b.type === "scan_range");
            },
        );
        let techScanRangeBonus = 0;
        scanRangeTechs.forEach((techId) => {
            const tech = RESEARCH_TREE[techId];
            tech.bonuses.forEach((bonus) => {
                if (bonus.type === "scan_range") {
                    techScanRangeBonus = Math.max(
                        techScanRangeBonus,
                        bonus.value,
                    );
                }
            });
        });
        if (techScanRangeBonus > 0) {
            maxRange = Math.floor(maxRange * (1 + techScanRangeBonus));
        }

        // Apply crystalline artifactBonus (+15% to artifact effects)
        let artifactBonus = 0;
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.specialTraits) {
                const trait = race.specialTraits.find(
                    (t) => t.id === "resonance" && t.effects.artifactBonus,
                );
                if (trait) {
                    artifactBonus = Math.max(
                        artifactBonus,
                        trait.effects.artifactBonus as number,
                    );
                }
            }
        });
        if (artifactBonus > 0 && quantumScanner) {
            maxRange = Math.floor(maxRange * (1 + artifactBonus));
        }

        return maxRange;
    },

    calculateFuelCost: (targetTier: number) => {
        const state = get();
        const currentTier = state.currentSector?.tier ?? 1;
        const distance = Math.abs(targetTier - currentTier);

        // Base fuel cost per tier distance
        const baseCost =
            distance === 0 ? 5 : distance * get().getFuelEfficiency();

        // Apply race fuel efficiency bonuses (voidborn: +20% fuel efficiency = -20% consumption)
        let modifier = 1;
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            let fuelBonus = 0;
            if (race?.crewBonuses.fuelEfficiency) {
                fuelBonus = Math.max(
                    fuelBonus,
                    race.crewBonuses.fuelEfficiency,
                );
            }
            if (fuelBonus > 0) {
                modifier *= 1 - fuelBonus;
            }
        });

        // Captain traits can modify fuel consumption
        const captain = state.crew.find((c) => c.profession === "pilot");
        if (captain?.traits) {
            captain.traits.forEach((t) => {
                if (t.effect?.fuelConsumption)
                    modifier *= t.effect.fuelConsumption;
            });
        }

        // Apply fuel efficiency bonus from planet effects (Mystic Ritual)
        const fuelEfficiencyEffect = state.activeEffects.find((e) =>
            e.effects.some((ef) => ef.type === "fuel_efficiency"),
        );
        if (fuelEfficiencyEffect) {
            const fuelEffBonus =
                (fuelEfficiencyEffect.effects.find(
                    (ef) => ef.type === "fuel_efficiency",
                )?.value as number) || 0;
            modifier *= 1 - fuelEffBonus;
        }

        const result = Math.ceil(baseCost * modifier);
        // Safeguard against NaN
        return isNaN(result) ? 5 : result;
    },

    areEnginesFunctional: () => {
        const state = get();
        const engines = state.ship.modules.filter((m) => m.type === "engine");
        return engines.some((e) => !e.disabled && e.health > 0);
    },

    areFuelTanksFunctional: () => {
        const state = get();
        const tanks = state.ship.modules.filter((m) => m.type === "fueltank");
        return tanks.some((t) => !t.disabled && t.health > 0);
    },

    refuel: (amount: number, price: number) => {
        const state = get();
        // Safeguard against NaN or undefined fuel
        const maxFuel = state.ship.maxFuel || 0;
        const currentFuel = state.ship.fuel || 0;
        const spaceAvailable = maxFuel - currentFuel;
        const actualAmount = Math.min(amount, spaceAvailable);

        if (actualAmount <= 0) {
            get().addLog("Топливные баки полны!", "warning");
            return;
        }

        if (state.credits < price) {
            get().addLog("Недостаточно кредитов!", "error");
            return;
        }

        set((s) => ({
            credits: s.credits - price,
            ship: { ...s.ship, fuel: (s.ship.fuel || 0) + actualAmount },
        }));
        get().addLog(`Заправка: +${actualAmount} топлива за ${price}₢`, "info");
        playSound("success");
    },

    gainExp: (crewMember, amount) => {
        if (!crewMember) return;

        // Apply racial exp bonuses (human: +15% quick_learner)
        // const race = RACES[crewMember.race];
        let expMultiplier = 1;

        // Human racial bonus: +15% exp
        if (crewMember.race === "human") {
            expMultiplier += 0.15;
        }

        // Apply crew trait exp bonuses
        crewMember.traits?.forEach((trait) => {
            if (trait.effect?.expBonus) {
                expMultiplier += trait.effect.expBonus;
            }
        });

        // Apply crew_exp technology bonuses
        const currentState = get();
        const crewExpTechs = currentState.research.researchedTechs.filter(
            (techId) => {
                const tech = RESEARCH_TREE[techId];
                return tech.bonuses.some((b) => b.type === "crew_exp");
            },
        );
        crewExpTechs.forEach((techId) => {
            const tech = RESEARCH_TREE[techId];
            tech.bonuses.forEach((bonus) => {
                if (bonus.type === "crew_exp") {
                    expMultiplier += bonus.value;
                }
            });
        });

        const finalAmount = Math.floor(amount * expMultiplier);

        set((s) => ({
            crew: s.crew.map((c) => {
                if (c.id !== crewMember.id) return c;
                const newExp = (c.exp || 0) + finalAmount;
                const expNeeded = (c.level || 1) * 100;
                if (newExp >= expNeeded) {
                    playSound("success");
                    get().addLog(
                        `${c.name} повысил уровень до ${(c.level || 1) + 1}!`,
                        "info",
                    );
                    return {
                        ...c,
                        level: (c.level || 1) + 1,
                        exp: newExp - expNeeded,
                    };
                }
                return { ...c, exp: newExp };
            }),
        }));
    },

    nextTurn: () => {
        const state = get();
        // Reset movedThisTurn for all crew members at start of new turn
        // This allows everyone to move once per turn
        set((s) => ({
            turn: s.turn + 1,
            randomEventCooldown: s.randomEventCooldown - 1,
            crew: s.crew.map((c) => ({
                ...c,
                movedThisTurn: false,
            })),
            ship: {
                ...s.ship,
                moduleMovedThisTurn: false,
                modules: s.ship.modules.map((m) => ({
                    ...m,
                    movedThisTurn: false,
                })),
            },
        }));

        // ═══════════════════════════════════════════════════════════════
        // PASSIVE EXPERIENCE - All crew gain small exp every 5 turns on ship
        // ═══════════════════════════════════════════════════════════════
        const turn = state.turn;
        if (turn % 5 === 0) {
            state.crew.forEach((c) => {
                get().gainExp(c, 2); // 2 exp every 5 turns
            });
            get().addLog(
                `📋 Экипаж получил +2 опыта (службу на корабле)`,
                "info",
            );
        }

        // Remove expired planet effects
        get().removeExpiredEffects();

        get().updateShipStats();

        // Process research
        get().processResearch();

        // ═══════════════════════════════════════════════════════════════
        // POWER MANAGEMENT - Disable modules if power deficit
        // ═══════════════════════════════════════════════════════════════
        const currentPower = get().getTotalPower();
        const currentConsumption = get().getTotalConsumption();
        const powerDeficit = currentConsumption - currentPower;

        if (powerDeficit > 0) {
            // Need to disable modules to balance power
            const currentState = get();
            const modulesByPriority = [
                // Lowest priority (disable first)
                { type: "cargo", name: "Грузовой отсек" },
                { type: "fueltank", name: "Топливный бак" },
                { type: "scanner", name: "Сканер" },
                { type: "drill", name: "Бур" },
                { type: "weaponbay", name: "Оружейная палуба" },
                { type: "shield", name: "Генератор щита" },
                { type: "engine", name: "Двигатель" },
                // Highest priority (never disable)
                // cockpit, lifesupport, reactor - essential modules
            ];

            let disabledCount = 0;
            const updatedModules = [...currentState.ship.modules];

            // Calculate current power after each disable
            let deficit = powerDeficit;

            for (const priority of modulesByPriority) {
                if (deficit <= 0) break;

                // Find enabled modules of this type
                const enabledModules = updatedModules.filter(
                    (m) =>
                        m.type === priority.type && !m.disabled && m.health > 0,
                );

                for (const mod of enabledModules) {
                    if (deficit <= 0) break;

                    // Calculate power saved by disabling this module
                    const powerSaved = mod.consumption || 0;
                    if (powerSaved > 0) {
                        // Disable the module
                        const moduleIndex = updatedModules.findIndex(
                            (m) => m.id === mod.id,
                        );
                        if (moduleIndex >= 0) {
                            // Apply 10% damage from emergency shutdown
                            const damage = Math.floor(
                                (mod.maxHealth || 100) *
                                    EMERGENCY_SHUTDOWN_DAMAGE,
                            );
                            updatedModules[moduleIndex] = {
                                ...mod,
                                disabled: true,
                                health: Math.max(0, mod.health - damage),
                            };
                            deficit -= powerSaved;
                            disabledCount++;
                            get().addLog(
                                `⚠️ ${priority.name} отключен (нехватка энергии, -${damage}❤️)`,
                                "warning",
                            );
                        }
                    }
                }
            }

            if (disabledCount > 0) {
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: updatedModules,
                    },
                }));
                get().updateShipStats();
                get().addLog(
                    `⚡ Отключено модулей: ${disabledCount}. Доступно энергии: ${get().getTotalPower() - get().getTotalConsumption()}`,
                    "warning",
                );
            } else {
                // Cannot disable more modules - critical power shortage
                get().addLog(
                    `⚡ КРИТИЧЕСКАЯ НЕХВАТКА ЭНЕРГИИ! Потребление: ${currentConsumption}, Генерация: ${currentPower}`,
                    "error",
                );
            }
        } else {
            // Power surplus - re-enable disabled modules if possible
            const currentState = get();
            const disabledModules = currentState.ship.modules.filter(
                (m) => m.disabled && m.health > 0,
            );

            if (disabledModules.length > 0) {
                // Check if we have enough power to re-enable all disabled modules
                const powerNeeded = disabledModules.reduce(
                    (sum, m) => sum + (m.consumption || 0),
                    0,
                );

                if (currentPower >= currentConsumption + powerNeeded) {
                    // We have enough power to re-enable all modules
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
                    get().updateShipStats();
                    get().addLog(
                        `⚡ Включено модулей: ${disabledModules.length}. Баланс: ${get().getTotalPower() - get().getTotalConsumption()}`,
                        "info",
                    );
                }
            }
        }

        // Shield regen
        let shieldRegen = Math.floor(Math.random() * 6) + 5;

        // Apply race shieldRegen bonuses (voidborn: +5 shield regen)
        state.crew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.specialTraits) {
                const shieldTrait = race.specialTraits.find(
                    (t) => t.effects.shieldRegen,
                );
                if (shieldTrait && shieldTrait.effects.shieldRegen) {
                    shieldRegen += Math.floor(
                        Number(shieldTrait.effects.shieldRegen),
                    );
                }
                // TECHNO-SYMBIOSIS - Xenosymbionts provide +2 shield regen when merged with ship
                if (race.id === "xenosymbiont") {
                    const symbiosisTrait = race.specialTraits.find(
                        (t) => t.effects.canMerge,
                    );
                    if (symbiosisTrait) {
                        shieldRegen += 2;
                    }
                }
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // NANITE HULL - Bonus shield regeneration
        // ═══════════════════════════════════════════════════════════════
        const naniteHull = state.artifacts.find(
            (a) => a.effect.type === "shield_regen" && a.effect.active,
        );
        if (naniteHull) {
            shieldRegen += Number(naniteHull.effect.value || 10);
        }

        set((s) => ({
            ship: {
                ...s.ship,
                shields: Math.min(
                    s.ship.maxShields,
                    s.ship.shields + shieldRegen,
                ),
            },
        }));
        if (shieldRegen > 0 && state.ship.shields < state.ship.maxShields) {
            get().addLog(
                `Щиты: +${shieldRegen} (${get().ship.shields}/${get().ship.maxShields})`,
                "info",
            );
        }

        // ═══════════════════════════════════════════════════════════════
        // BROKEN MODULES - Crew inside broken modules take damage
        // ═══════════════════════════════════════════════════════════════
        const brokenModulesWithCrew = state.ship.modules.filter(
            (m) => m.health <= 0 && state.crew.some((c) => c.moduleId === m.id),
        );
        if (brokenModulesWithCrew.length > 0) {
            brokenModulesWithCrew.forEach((m) => {
                const damage = 10;
                set((s) => ({
                    crew: s.crew.map((c) =>
                        c.moduleId === m.id
                            ? { ...c, health: Math.max(0, c.health - damage) }
                            : c,
                    ),
                }));
                get().addLog(
                    `⚠️ Экипаж в "${m.name}": -${damage} (модуль разрушен)`,
                    "error",
                );
            });
            // Check for dead crew
            const deadCrew = get().crew.filter((c) => c.health <= 0);
            if (deadCrew.length > 0) {
                set((s) => ({
                    crew: s.crew.filter((c) => c.health > 0),
                }));
                get().addLog(
                    `☠️ Погибли: ${deadCrew.map((c) => c.name).join(", ")}`,
                    "error",
                );
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // CURSED ARTIFACTS - Negative effects
        // ═══════════════════════════════════════════════════════════════
        const cursedArtifacts = state.artifacts.filter(
            (a) => a.cursed && a.effect.active,
        );

        cursedArtifacts.forEach((artifact) => {
            // Process POSITIVE effects from cursed artifacts
            const positiveType = artifact.effect?.type;
            const positiveValue = artifact.effect?.value || 0;

            // Auto-repair: repair modules by X% per turn
            if (positiveType === "auto_repair" && positiveValue > 0) {
                if (state.ship.modules.length > 0) {
                    const needsRepair = state.ship.modules.some(
                        (m) => m.health < (m.maxHealth || 100),
                    );
                    if (needsRepair) {
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) => ({
                                    ...m,
                                    health: Math.min(
                                        m.maxHealth || 100,
                                        m.health + positiveValue,
                                    ),
                                })),
                            },
                        }));
                        get().addLog(
                            `✨ ${artifact.name}: Модули отремонтированы на +${positiveValue}%`,
                            "info",
                        );
                    }
                }
            }

            // Process NEGATIVE effects
            const negativeType = artifact.negativeEffect?.type;
            const negativeValue = artifact.negativeEffect?.value || 0;

            switch (negativeType) {
                case "happiness_drain":
                    // -X happiness to all crew per turn (except synthetics)
                    set((s) => ({
                        crew: s.crew.map((c) => {
                            // Synthetics don't have morale/happiness
                            if (c.race === "synthetic") return c;
                            return {
                                ...c,
                                happiness: Math.max(
                                    0,
                                    c.happiness - negativeValue,
                                ),
                            };
                        }),
                    }));
                    if (negativeValue > 0) {
                        get().addLog(
                            `⚠️ ${artifact.name}: -${negativeValue} счастья экипажу`,
                            "warning",
                        );
                    }
                    break;

                case "morale_drain":
                    // -X morale to all crew per turn (except synthetics)
                    set((s) => ({
                        crew: s.crew.map((c) => {
                            // Synthetics don't have morale/happiness
                            if (c.race === "synthetic") return c;
                            return {
                                ...c,
                                happiness: Math.max(
                                    0,
                                    c.happiness - negativeValue,
                                ),
                            };
                        }),
                    }));
                    if (negativeValue > 0) {
                        get().addLog(
                            `⚠️ ${artifact.name}: -${negativeValue} морали экипажу`,
                            "warning",
                        );
                    }
                    break;

                case "module_damage":
                    // Random module loses X health per turn
                    if (state.ship.modules.length > 0) {
                        const randomModuleIdx = Math.floor(
                            Math.random() * state.ship.modules.length,
                        );
                        const targetModule =
                            state.ship.modules[randomModuleIdx];
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m, i) =>
                                    i === randomModuleIdx
                                        ? {
                                              ...m,
                                              health: Math.max(
                                                  1,
                                                  m.health - negativeValue,
                                              ),
                                          }
                                        : m,
                                ),
                            },
                        }));
                        get().addLog(
                            `⚠️ ${artifact.name}: ${targetModule.name} повреждён на -${negativeValue}%`,
                            "warning",
                        );
                    }
                    break;

                case "crew_desertion":
                    // X% chance each crew member leaves per turn
                    state.crew.forEach((crewMember) => {
                        if (Math.random() * 100 < negativeValue) {
                            set((s) => ({
                                crew: s.crew.filter(
                                    (c) => c.id !== crewMember.id,
                                ),
                            }));
                            get().addLog(
                                `⚠️ ${artifact.name}: ${crewMember.name} покинул корабль`,
                                "warning",
                            );
                        }
                    });
                    break;

                case "crew_mutation":
                    // X% chance each crew member gets negative mutation trait
                    state.crew.forEach((crewMember) => {
                        if (Math.random() * 100 < negativeValue) {
                            const newTrait =
                                MUTATION_TRAITS[
                                    Math.floor(
                                        Math.random() * MUTATION_TRAITS.length,
                                    )
                                ];
                            set((s) => ({
                                crew: s.crew.map((c) =>
                                    c.id === crewMember.id
                                        ? {
                                              ...c,
                                              traits: [
                                                  ...c.traits,
                                                  {
                                                      name: getMutationTraitName(
                                                          newTrait,
                                                      ),
                                                      desc: getMutationTraitDesc(
                                                          newTrait,
                                                      ),
                                                      effect: {}, // Mutation effects handled separately
                                                      type: "negative",
                                                      rarity: "mutation",
                                                  },
                                              ],
                                          }
                                        : c,
                                ),
                            }));
                            get().addLog(
                                `⚠️ ${artifact.name}: ${crewMember.name} мутировал`,
                                "warning",
                            );
                        }
                    });
                    break;

                case "health_drain":
                    // -X health to all crew per turn (for Void Drive artifact during travel)
                    // Only applies if traveling (handled in travel logic)
                    break;

                case "self_damage":
                    // Damage dealt after combat (handled in combat end)
                    break;

                case "ambush_chance":
                    // Increased ambush chance (handled in distress signal logic)
                    break;

                case "happiness_drain":
                    // Handled above in cursed artifacts section
                    break;

                case "morale_drain":
                    // Handled above in cursed artifacts section
                    break;

                case "module_damage":
                    // Handled above in cursed artifacts section
                    break;

                case "crew_desertion":
                    // Handled above in cursed artifacts section
                    break;

                case "crew_mutation":
                    // Handled above in cursed artifacts section
                    break;
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // MUTATION TRAITS - Apply negative effects from mutations
        // ═══════════════════════════════════════════════════════════════
        state.crew.forEach((crewMember) => {
            crewMember.traits.forEach((mutation) => {
                // Check mutation subtype by name
                const isNightmares = mutation.name.includes("Кошмары");
                const isParanoid = mutation.name.includes("Паранойя");
                const isUnstable = mutation.name.includes("Нестабильность");

                // Nightmares: -10 happiness per turn
                if (isNightmares) {
                    set((s) => ({
                        crew: s.crew.map((c) =>
                            c.id === crewMember.id
                                ? {
                                      ...c,
                                      happiness: Math.max(0, c.happiness - 10),
                                  }
                                : c,
                        ),
                    }));
                    get().addLog(
                        `⚠️ ${crewMember.name}: Мутация Кошмары -10 счастья`,
                        "warning",
                    );
                }
                // Paranoid: -15 happiness (morale)
                if (isParanoid) {
                    set((s) => ({
                        crew: s.crew.map((c) =>
                            c.id === crewMember.id
                                ? {
                                      ...c,
                                      happiness: Math.max(0, c.happiness - 15),
                                  }
                                : c,
                        ),
                    }));
                    get().addLog(
                        `⚠️ ${crewMember.name}: Мутация Паранойя -15 счастья`,
                        "warning",
                    );
                }
                // Unstable: Random happiness swings (-20 to +10)
                if (isUnstable) {
                    const randomChange = Math.floor(Math.random() * 31) - 20; // -20 to +10
                    set((s) => ({
                        crew: s.crew.map((c) =>
                            c.id === crewMember.id
                                ? {
                                      ...c,
                                      happiness: Math.max(
                                          0,
                                          Math.min(
                                              100,
                                              c.happiness + randomChange,
                                          ),
                                      ),
                                  }
                                : c,
                        ),
                    }));
                    if (randomChange !== 0) {
                        get().addLog(
                            `⚠️ ${crewMember.name}: Мутация Нестабильность ${randomChange > 0 ? "+" : ""}${randomChange} счастья`,
                            randomChange < 0 ? "warning" : "info",
                        );
                    }
                }
            });
        });

        // ═══════════════════════════════════════════════════════════════
        // CREW DESERTION - Remove crew with 0 happiness for 3+ turns
        // Synthetics don't have morale and cannot desert
        // ═══════════════════════════════════════════════════════════════
        set((s) => {
            const crewToKeep = s.crew.filter((c) => {
                // Synthetics don't have morale and cannot desert
                if (c.race === "synthetic") return true;

                if (c.happiness <= 0) {
                    const turnsAtZero = c.turnsAtZeroHappiness || 0;
                    if (turnsAtZero >= 3) {
                        get().addLog(
                            `${c.name} покинул корабль из-за низкого настроения!`,
                            "warning",
                        );
                        return false; // Remove crew member
                    }
                    // Increment turns at zero happiness
                    return true; // Keep but will update
                }
                // Reset turnsAtZeroHappiness if happiness recovered
                return true;
            });

            // Update turnsAtZeroHappiness for crew with 0 happiness
            const updatedCrew = crewToKeep.map((c) => ({
                ...c,
                turnsAtZeroHappiness:
                    c.happiness <= 0 ? (c.turnsAtZeroHappiness || 0) + 1 : 0,
            }));

            return { crew: updatedCrew };
        });

        // Traveling
        const traveling = get().traveling;
        if (!traveling) return;

        const nextTurnsLeft = traveling.turnsLeft - 1;

        set((s) => ({
            traveling: s.traveling
                ? { ...s.traveling, turnsLeft: nextTurnsLeft }
                : null,
        }));
        get().addLog(
            `Путешествие в ${traveling.destination.name}: ${get().traveling?.turnsLeft} ходов`,
            "info",
        );

        if (Math.random() < 0.3) {
            const events = ["Аномалия", "Астероиды", "Тревога", "Сигнал"];
            const event = events[Math.floor(Math.random() * events.length)];
            get().addLog(event, "warning");
            if (event === "Астероиды") {
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id ===
                            s.ship.modules[
                                Math.floor(
                                    Math.random() * s.ship.modules.length,
                                )
                            ].id
                                ? {
                                      ...m,
                                      health: Math.max(10, m.health - 5),
                                  }
                                : m,
                        ),
                    },
                }));
            }
        }

        if (nextTurnsLeft <= 0) {
            // Travel complete - no additional effects needed
            // (Void Drive health drain already applied during travel initiation)

            const destinationSector = traveling.destination;

            // Update patrol contracts (xenosymbiont quest - visit sectors)
            const patrolContracts = state.activeContracts.filter(
                (c) =>
                    c.type === "patrol" &&
                    c.isRaceQuest &&
                    c.targetSectors?.includes(destinationSector.id),
            );

            // Update scan_planet contracts - check if we visited the target planet type
            const scanContracts = state.activeContracts.filter(
                (c) =>
                    c.type === "scan_planet" &&
                    c.targetSector === destinationSector.id,
            );

            let newActiveContracts = state.activeContracts;
            let contractCompleted = false;
            let completedContractId = "";

            // Process scan_planet contracts
            scanContracts.forEach((c) => {
                // Check if player has scanner
                const hasScanner = state.ship.modules.some(
                    (m) => m.type === "scanner" && !m.disabled && m.health > 0,
                );
                if (!hasScanner) {
                    get().addLog(
                        `📡 Сканирование: нужен сканер для выполнения контракта`,
                        "warning",
                    );
                    return;
                }

                // Check if target planet type exists in this sector
                const hasTargetPlanet = destinationSector.locations.some(
                    (l) => l.type === "planet" && l.planetType === c.planetType,
                );
                if (!hasTargetPlanet) {
                    get().addLog(
                        `📡 Сканирование: планета типа "${c.planetType}" не найдена`,
                        "warning",
                    );
                    return;
                }

                // Mark as visited
                const updated = { ...c, visited: (c.visited || 0) + 1 };
                newActiveContracts = newActiveContracts.map((ac) =>
                    ac.id === c.id ? updated : ac,
                );

                get().addLog(
                    `📡 Сканирование: ${c.planetType} отсканировано! Возвращайтесь на базу`,
                    "info",
                );
            });

            patrolContracts.forEach((c) => {
                const visitedSectors = [
                    ...new Set([
                        ...(c.visitedSectors || []),
                        destinationSector.id,
                    ]),
                ];
                const targetSectors = c.targetSectors || [];

                if (visitedSectors.length >= targetSectors.length) {
                    // All sectors visited - complete contract
                    contractCompleted = true;
                    completedContractId = c.id;
                    get().addLog(
                        `Сбор биообразцов завершён! +${c.reward}₢`,
                        "info",
                    );

                    // Give experience to all crew members
                    const expReward = CONTRACT_REWARDS.patrol.baseExp;
                    giveCrewExperience(
                        expReward,
                        `Экипаж получил опыт: +${expReward} ед.`,
                    );

                    newActiveContracts = newActiveContracts.filter(
                        (ac) => ac.id !== c.id,
                    );
                } else {
                    // Update progress
                    newActiveContracts = newActiveContracts.map((ac) =>
                        ac.id === c.id ? { ...ac, visitedSectors } : ac,
                    );
                    get().addLog(
                        `Биообразцы: ${visitedSectors.length}/${targetSectors.length} секторов`,
                        "info",
                    );
                }
            });

            set((s) => ({
                currentSector: destinationSector,
                traveling: null,
                credits: contractCompleted
                    ? s.credits +
                      (patrolContracts.find((c) => c.id === completedContractId)
                          ?.reward || 0)
                    : s.credits,
                completedContractIds: contractCompleted
                    ? [...s.completedContractIds, completedContractId]
                    : s.completedContractIds,
                activeContracts: newActiveContracts,
            }));
            get().addLog(`Прибытие в ${destinationSector.name}`, "info");
            get().updateShipStats();
            set({ gameMode: "sector_map" });
            return;
        }

        // Random events (only when not in combat)
        if (
            !state.currentCombat &&
            get().randomEventCooldown <= 0 &&
            Math.random() < 0.3
        ) {
            // Trigger random event
            const events = [
                {
                    name: "Космический шторм",
                    effect: () => {
                        const dmg = Math.floor(Math.random() * 15) + 5;
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) =>
                                    m.id ===
                                    s.ship.modules[
                                        Math.floor(
                                            Math.random() *
                                                s.ship.modules.length,
                                        )
                                    ].id
                                        ? {
                                              ...m,
                                              health: Math.max(
                                                  10,
                                                  m.health - dmg,
                                              ),
                                          }
                                        : m,
                                ),
                            },
                        }));
                        get().addLog(
                            `Шторм! Модуль повреждён: -${dmg}%`,
                            "warning",
                        );
                    },
                },
                {
                    name: "Капсула",
                    effect: () => {
                        const r = Math.floor(Math.random() * 30) + 20;
                        set((s) => ({ credits: s.credits + r }));
                        get().addLog(`Найдена капсула! +${r}₢`, "info");
                    },
                },
                {
                    name: "Вирус",
                    effect: () => {
                        set((s) => ({
                            crew: s.crew.map((c) => ({
                                ...c,
                                happiness: Math.max(0, c.happiness - 10),
                            })),
                        }));
                        get().addLog("Вирус! Настроение -10", "error");
                    },
                },
            ];
            const event = events[Math.floor(Math.random() * events.length)];
            event.effect();
            set({ randomEventCooldown: 3 });
        }

        // Crew assignments - now respect module positions
        get().crew.forEach((c) => {
            const crewRace = RACES[c.race];
            const currentModule = get().ship.modules.find(
                (m) => m.id === c.moduleId,
            );

            // ═══════════════════════════════════════════════════════════════
            // AI GLITCH - Synthetic crew may malfunction (5% chance)
            // ═══════════════════════════════════════════════════════════════
            if (crewRace?.id === "synthetic") {
                const glitchTrait = crewRace.specialTraits.find(
                    (t) => t.effects.glitchChance,
                );
                if (glitchTrait && glitchTrait.effects.glitchChance) {
                    const glitchChance = Number(
                        glitchTrait.effects.glitchChance,
                    );
                    if (Math.random() < glitchChance) {
                        get().addLog(
                            `⚠️ ${c.name}: Сбой ИИ! Действие не выполнено`,
                            "warning",
                        );
                        // Skip this crew member's action for this turn
                        return;
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // MODULE DAMAGE - Crew takes damage in damaged/destroyed modules
            // ═══════════════════════════════════════════════════════════════
            if (currentModule) {
                const moduleHealth = currentModule.health || 0;

                // Check if medic with firstaid is in the same module
                const medicWithFirstAid = get().crew.find(
                    (cr) =>
                        cr.moduleId === c.moduleId &&
                        cr.profession === "medic" &&
                        cr.assignment === "firstaid",
                );
                const firstAidReduction = medicWithFirstAid ? 0.5 : 1; // 50% damage reduction

                // Destroyed module (health <= 0) - crew takes heavy damage
                if (moduleHealth <= 0) {
                    const moduleDamage = Math.floor(25 * firstAidReduction); // Heavy damage in destroyed module
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.id === c.id
                                ? {
                                      ...cr,
                                      health: Math.max(
                                          0,
                                          cr.health - moduleDamage,
                                      ),
                                  }
                                : cr,
                        ),
                    }));
                    get().addLog(
                        `☠️ ${c.name}: Модуль "${currentModule.name}" разрушен! -${moduleDamage} HP${medicWithFirstAid ? " (аптечки: -50% урона)" : ""}`,
                        medicWithFirstAid ? "warning" : "error",
                    );
                } else if (moduleHealth < 20) {
                    // Critical damage (< 20%) - crew takes damage
                    const moduleDamage = Math.floor(10 * firstAidReduction); // Damage in critically damaged module
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.id === c.id
                                ? {
                                      ...cr,
                                      health: Math.max(
                                          0,
                                          cr.health - moduleDamage,
                                      ),
                                  }
                                : cr,
                        ),
                    }));
                    get().addLog(
                        `⚠️ ${c.name}: Модуль "${currentModule.name}" критически повреждён (<20%)! -${moduleDamage} HP${medicWithFirstAid ? " (аптечки: -50% урона)" : ""}`,
                        "warning",
                    );
                }
                // Modules with health >= 20% are safe - no crew damage
            }

            // Apply racial health regen (human: +5 from crewBonuses)
            // Only when assigned to "heal" task
            let healthRegen = crewRace?.crewBonuses?.health || 0;
            // Get regen bonus from crew traits (e.g., "Непобедимый": +10%)
            let regenBonus = 0;
            c.traits?.forEach((trait) => {
                if (trait.effect.regenBonus) {
                    regenBonus += trait.effect.regenBonus;
                }
            });
            if (regenBonus > 0) {
                healthRegen = Math.floor(healthRegen * (1 + regenBonus));
            }
            if (healthRegen > 0 && c.assignment === "heal") {
                set((s) => ({
                    crew: s.crew.map((cr) =>
                        cr.id === c.id
                            ? {
                                  ...cr,
                                  health: Math.min(
                                      cr.maxHealth || 100,
                                      cr.health + healthRegen,
                                  ),
                              }
                            : cr,
                    ),
                }));
                if (healthRegen > 0 && c.health < (c.maxHealth || 100)) {
                    get().addLog(
                        `${c.name}: Регенерация +${healthRegen} HP`,
                        "info",
                    );
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // MEDICAL BAY - Auto-heal crew in medical modules
            // ═══════════════════════════════════════════════════════════════
            if (currentModule?.type === "medical" && currentModule.health > 0) {
                // Check if medical bay has power
                const hasPower =
                    get().getTotalPower() > get().getTotalConsumption();
                if (hasPower) {
                    // Check if medic is in this module for synergy bonus
                    const medicInModule = get().crew.find(
                        (cr) =>
                            cr.moduleId === c.moduleId &&
                            cr.profession === "medic",
                    );
                    const healAmount = medicInModule ? 15 : 8; // 15 HP with medic, 8 HP without

                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.id === c.id
                                ? {
                                      ...cr,
                                      health: Math.min(
                                          cr.maxHealth || 100,
                                          cr.health + healAmount,
                                      ),
                                  }
                                : cr,
                        ),
                    }));

                    if (c.health < (c.maxHealth || 100)) {
                        get().addLog(
                            `🏥 ${c.name}: Медотсек ${medicInModule ? "+доктор" : ""} +${healAmount} HP`,
                            "info",
                        );
                    }
                }
            }

            if (c.assignment) {
                // const currentModule = get().ship.modules.find(
                //     (m) => m.id === c.moduleId,
                // );
                const crewInSameModule = get().crew.filter(
                    (cr) => cr.moduleId === c.moduleId,
                );

                switch (c.assignment) {
                    case "repair": {
                        // Engineer can only repair the module they're in
                        if (!currentModule) break;
                        let repairAmount = 15;

                        // Apply trait task bonuses
                        let taskBonus = 0;
                        c.traits?.forEach((trait) => {
                            if (trait.effect.taskBonus) {
                                taskBonus += trait.effect.taskBonus;
                            }
                            if (trait.effect.doubleTaskEffect) {
                                taskBonus = 1; // 100% bonus = double effect
                            }
                        });
                        if (taskBonus > 0) {
                            repairAmount = Math.floor(
                                repairAmount * (1 + taskBonus),
                            );
                        }

                        if (crewRace?.crewBonuses.repair) {
                            repairAmount = Math.floor(
                                repairAmount *
                                    (1 + crewRace.crewBonuses.repair),
                            );
                        }

                        // TECHNO-SYMBIOSIS - Xenosymbionts merge with ship modules (+10% repair)
                        if (crewRace?.id === "xenosymbiont") {
                            const symbiosisTrait = crewRace.specialTraits.find(
                                (t) => t.effects.canMerge,
                            );
                            if (symbiosisTrait) {
                                repairAmount = Math.floor(repairAmount * 1.1);
                                get().addLog(
                                    `🦠 ${c.name}: Техно-симбиоз с "${currentModule.name}" (+10% ремонт)`,
                                    "info",
                                );
                            }
                        }

                        // Check if module actually needs repair
                        if (currentModule.health >= 100) {
                            get().addLog(
                                `${c.name}: Модуль "${currentModule.name}" полностью цел (опыт не получен)`,
                                "info",
                            );
                            break;
                        }

                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) =>
                                    m.id === currentModule.id
                                        ? {
                                              ...m,
                                              health: Math.min(
                                                  100,
                                                  m.health + repairAmount,
                                              ),
                                          }
                                        : m,
                                ),
                            },
                        }));
                        get().addLog(
                            `${c.name}: Ремонт "${currentModule.name}" +${repairAmount}%`,
                            "info",
                        );
                        get().gainExp(c, 8);
                        break;
                    }
                    case "heal": {
                        // Medic heals all crew in the same module (including themselves)
                        if (crewInSameModule.length > 0 || currentModule) {
                            let healAmount = 20;

                            // Apply trait task bonuses
                            let taskBonus = 0;
                            c.traits?.forEach((trait) => {
                                if (trait.effect.taskBonus) {
                                    taskBonus += trait.effect.taskBonus;
                                }
                                if (trait.effect.doubleTaskEffect) {
                                    taskBonus = 1; // 100% bonus = double effect
                                }
                            });
                            if (taskBonus > 0) {
                                healAmount = Math.floor(
                                    healAmount * (1 + taskBonus),
                                );
                            }

                            // Check which crew members actually need healing
                            const crewNeedingHealing = get().crew.filter(
                                (cr) =>
                                    cr.moduleId === c.moduleId &&
                                    cr.health < (cr.maxHealth || 100),
                            );

                            if (crewNeedingHealing.length === 0) {
                                // Everyone is already at full health - no exp
                                get().addLog(
                                    `${c.name}: Все здоровы (опыт не получен)`,
                                    "info",
                                );
                                break;
                            }

                            set((s) => ({
                                crew: s.crew.map((cr) =>
                                    cr.moduleId === c.moduleId
                                        ? {
                                              ...cr,
                                              health: Math.min(
                                                  cr.maxHealth || 100,
                                                  cr.health + healAmount,
                                              ),
                                          }
                                        : cr,
                                ),
                            }));
                            const healedCount = crewNeedingHealing.length;
                            get().addLog(
                                `${c.name}: Лечение модуля +${healAmount} HP (${healedCount} существ)`,
                                "info",
                            );
                            get().gainExp(c, 6 * healedCount);
                        }
                        break;
                    }
                    case "morale": {
                        // Medic boosts morale of all crew in the same module (including themselves)
                        if (crewInSameModule.length > 0 || currentModule) {
                            let moraleAmount = 15;

                            // Apply trait task bonuses
                            let taskBonus = 0;
                            c.traits?.forEach((trait) => {
                                if (trait.effect.taskBonus) {
                                    taskBonus += trait.effect.taskBonus;
                                }
                                if (trait.effect.doubleTaskEffect) {
                                    taskBonus = 1; // 100% bonus = double effect
                                }
                            });
                            if (taskBonus > 0) {
                                moraleAmount = Math.floor(
                                    moraleAmount * (1 + taskBonus),
                                );
                            }

                            // Check if any crew member actually needs morale boost
                            const crewNeedingMorale = get().crew.filter(
                                (cr) =>
                                    cr.moduleId === c.moduleId &&
                                    cr.happiness < (cr.maxHappiness || 100),
                            );

                            if (crewNeedingMorale.length === 0) {
                                // Everyone already has 100% morale - no exp
                                get().addLog(
                                    `${c.name}: Мораль максимальная (опыт не получен)`,
                                    "info",
                                );
                                break;
                            }

                            set((s) => ({
                                crew: s.crew.map((cr) =>
                                    cr.moduleId === c.moduleId
                                        ? {
                                              ...cr,
                                              happiness: Math.min(
                                                  cr.maxHappiness || 100,
                                                  cr.happiness + moraleAmount,
                                              ),
                                          }
                                        : cr,
                                ),
                            }));
                            const boostedCount = crewNeedingMorale.length;
                            get().addLog(
                                `${c.name}: Мораль модуля +${moraleAmount} (${boostedCount} существ)`,
                                "info",
                            );
                            get().gainExp(c, 4 * boostedCount);
                        }
                        break;
                    }
                    case "firstaid": {
                        // Medic prepares first aid kits - reduces damage from module damage
                        // Effect is applied when crew takes damage from module
                        if (currentModule) {
                            get().addLog(
                                `${c.name}: Аптечки подготовлены (снижение урона от повреждений модуля)`,
                                "info",
                            );
                            get().gainExp(c, 5);
                        }
                        break;
                    }
                    case "evasion": {
                        // Pilot must be in cockpit for evasion maneuvers
                        if (currentModule?.type === "cockpit") {
                            let shieldAmount = 15;

                            // Apply trait task bonuses
                            let taskBonus = 0;
                            c.traits?.forEach((trait) => {
                                if (trait.effect.taskBonus) {
                                    taskBonus += trait.effect.taskBonus;
                                }
                                if (trait.effect.doubleTaskEffect) {
                                    taskBonus = 1; // 100% bonus = double effect
                                }
                            });
                            if (taskBonus > 0) {
                                shieldAmount = Math.floor(
                                    shieldAmount * (1 + taskBonus),
                                );
                            }

                            set((s) => ({
                                ship: {
                                    ...s.ship,
                                    shields: Math.min(
                                        s.ship.maxShields,
                                        s.ship.shields + shieldAmount,
                                    ),
                                },
                            }));
                            get().addLog(
                                `${c.name}: Щиты +${shieldAmount}`,
                                "info",
                            );
                            get().gainExp(c, 5);
                        } else {
                            get().addLog(
                                `${c.name}: Нужно быть в кабине для маневров!`,
                                "warning",
                            );
                        }
                        break;
                    }
                    case "overclock": {
                        // Engineer overclocks the module they're in
                        if (!currentModule) break;
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) =>
                                    m.id === currentModule.id
                                        ? {
                                              ...m,
                                              health: Math.max(
                                                  0,
                                                  m.health - 10,
                                              ),
                                          }
                                        : m,
                                ),
                            },
                        }));
                        get().addLog(
                            `${c.name}: Перегрузка "${currentModule.name}" (+25% урон,-10% броня)`,
                            "warning",
                        );
                        get().gainExp(c, 10);
                        break;
                    }
                    case "power": {
                        // Engineer can boost power only if in reactor
                        if (currentModule?.type === "reactor") {
                            // Power boost is handled in getTotalPower
                            get().addLog(
                                `${c.name}: Разгон реактора +5⚡`,
                                "info",
                            );
                            get().gainExp(c, 6);
                        } else {
                            get().addLog(
                                `${c.name}: Нужно быть в реакторе для разгона!`,
                                "warning",
                            );
                        }
                        break;
                    }
                    case "navigation": {
                        // Pilot must be in cockpit for navigation
                        if (currentModule?.type !== "cockpit") {
                            get().addLog(
                                `${c.name}: Навигация неактивна - нужен в кабине!`,
                                "warning",
                            );
                        }
                        // Navigation bonus is handled in getTotalConsumption
                        break;
                    }
                    case "targeting": {
                        // Pilot must be in cockpit for targeting
                        if (currentModule?.type !== "cockpit") {
                            get().addLog(
                                `${c.name}: Прицеливание неактивно - нужен в кабине!`,
                                "warning",
                            );
                        }
                        break;
                    }
                    case "rapidfire": {
                        // Gunner must be in weaponbay for rapid fire
                        if (currentModule?.type !== "weaponbay") {
                            get().addLog(
                                `${c.name}: Скорострельность неактивна - нужен в оружейной палубе!`,
                                "warning",
                            );
                        } else {
                            get().addLog(
                                `${c.name}: Скорострельность активна (+25% урон, -5% точность)`,
                                "info",
                            );
                            get().gainExp(c, 8);
                        }
                        break;
                    }
                    case "calibration": {
                        // Engineer must be in weaponbay for calibration
                        if (currentModule?.type !== "weaponbay") {
                            get().addLog(
                                `${c.name}: Калибровка неактивна - нужен в оружейной палубе!`,
                                "warning",
                            );
                        } else {
                            get().addLog(
                                `${c.name}: Калибровка активна (+10% точность)`,
                                "info",
                            );
                            get().gainExp(c, 8);
                        }
                        break;
                    }
                    case "patrol": {
                        // Scout can patrol from anywhere
                        get().addLog(`${c.name}: Патрулирование`, "info");
                        get().gainExp(c, 5);
                        break;
                    }
                    case "research": {
                        // Scientist can research from anywhere
                        get().addLog(`${c.name}: Исследования`, "info");
                        get().gainExp(c, 5);
                        break;
                    }
                    default:
                        get().gainExp(c, 5);
                }
            }

            // Apply negative trait effects: teamMorale (e.g., "Неряха" -5 morale to module mates)
            const crewInSameModule = get().crew.filter(
                (cr) => cr.moduleId === c.moduleId && cr.id !== c.id,
            );
            c.traits?.forEach((trait) => {
                // teamMorale: affects all crew in same module
                if (trait.effect.teamMorale && crewInSameModule.length > 0) {
                    const moralePenalty = Math.abs(trait.effect.teamMorale);
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.moduleId === c.moduleId && cr.id !== c.id
                                ? {
                                      ...cr,
                                      happiness: Math.max(
                                          0,
                                          cr.happiness - moralePenalty,
                                      ),
                                  }
                                : cr,
                        ),
                    }));
                    get().addLog(
                        `⚠️ ${c.name} (${trait.name}): -${moralePenalty} настроения модулю`,
                        "warning",
                    );
                }
                // moralePenalty: affects all crew in same module (e.g., "Бунтарь")
                if (trait.effect.moralePenalty && crewInSameModule.length > 0) {
                    const moralePenalty = Math.abs(trait.effect.moralePenalty);
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.moduleId === c.moduleId && cr.id !== c.id
                                ? {
                                      ...cr,
                                      happiness: Math.max(
                                          0,
                                          cr.happiness - moralePenalty,
                                      ),
                                  }
                                : cr,
                        ),
                    }));
                    get().addLog(
                        `⚠️ ${c.name} (${trait.name}): -${moralePenalty} настроения модулю`,
                        "warning",
                    );
                }
            });

            // Happiness decay
            const race = RACES[c.race];
            const happinessBonus = race?.crewBonuses?.happiness || 0;

            // Check for synthetic noHappiness trait (immunity to morale effects)
            const hasNoHappiness = race?.specialTraits?.some(
                (t) => t.id === "no_happiness",
            );

            if (hasNoHappiness) {
                // Synthetic: no happiness decay
                set((s) => ({
                    crew: s.crew.map((cr) => (cr.id === c.id ? cr : cr)),
                }));
            } else {
                // Apply race happiness bonus: positive bonus reduces decay, negative increases it
                // Base decay is 0-2, happiness bonus modifies the minimum happiness
                const decay = Math.floor(Math.random() * 3);
                const newHappiness = Math.max(
                    0,
                    Math.min(
                        100,
                        c.happiness - decay + Math.floor(happinessBonus / 2),
                    ),
                );
                set((s) => ({
                    crew: s.crew.map((cr) =>
                        cr.id === c.id
                            ? {
                                  ...cr,
                                  happiness: newHappiness,
                              }
                            : cr,
                    ),
                }));
            }

            // Apply alienPresencePenalty trait (xenosymbiont: -5, voidborn: -10)
            // Affects all organic races (not synthetic, not same race)
            if (crewRace?.specialTraits) {
                const penaltyTrait = crewRace.specialTraits.find(
                    (t) => t.effects.alienPresencePenalty,
                );
                if (penaltyTrait && penaltyTrait.effects.alienPresencePenalty) {
                    const penalty = Math.abs(
                        Number(penaltyTrait.effects.alienPresencePenalty),
                    );
                    // Affects organics in same module (not synthetic, not same race)
                    const affectedCrew = crewInSameModule.filter(
                        (cr) =>
                            cr.race !== "synthetic" &&
                            cr.race !== c.race &&
                            cr.id !== c.id,
                    );
                    if (affectedCrew.length > 0) {
                        set((s) => ({
                            crew: s.crew.map((cr) =>
                                cr.moduleId === c.moduleId &&
                                cr.race !== "synthetic" &&
                                cr.race !== c.race &&
                                cr.id !== c.id
                                    ? {
                                          ...cr,
                                          happiness: Math.max(
                                              0,
                                              cr.happiness - penalty,
                                          ),
                                      }
                                    : cr,
                            ),
                        }));
                        affectedCrew.forEach((cr) => {
                            get().addLog(
                                `😰 ${cr.name}: Беспокойство от ${crewRace.name} (-${penalty} 😞)`,
                                "warning",
                            );
                        });
                    }
                }
            }

            // Apply canMerge trait (xenosymbiont symbiosis with ship)
            // When xenosymbiont is assigned to a module, ship gains merge traits
            if (crewRace?.specialTraits && currentModule) {
                const canMergeTrait = crewRace.specialTraits.find(
                    (t) => t.effects.canMerge,
                );
                if (canMergeTrait) {
                    const mergeTraitId = `merge_${currentModule.id}`;
                    const existingMergeTrait = get().ship.mergeTraits?.find(
                        (t) => t.id === mergeTraitId,
                    );

                    if (!existingMergeTrait) {
                        // Add merge trait for this module
                        const mergeTrait: ShipMergeTrait = {
                            id: mergeTraitId,
                            name: `Симбиоз с "${currentModule.name}"`,
                            description:
                                "+10% эффективности, +5 HP к модулю от ксеноморфа",
                            effects: {
                                moduleEfficiency: 0.1,
                                moduleHealthBonus: 5,
                            },
                        };
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                mergeTraits: [
                                    ...(s.ship.mergeTraits || []),
                                    mergeTrait,
                                ],
                            },
                        }));
                        get().addLog(
                            `🔗 ${c.name} (${crewRace.name}): Симбиоз с модулем "${currentModule.name}"!`,
                            "info",
                        );
                    }
                }
            }

            // Apply crew trait effects: expBonus
            if (c.traits) {
                c.traits.forEach((trait) => {
                    if (trait.effect.expBonus) {
                        // Store for later use in gainExp
                    }
                });
            }
        });

        // Apply moduleMorale trait effects (Харизматичный, Лидер)
        // These crew members give +moduleMorale happiness to all crew in same module
        get().crew.forEach((c) => {
            c.traits?.forEach((trait) => {
                if (trait.effect.moduleMorale) {
                    const moraleBonus = trait.effect.moduleMorale;
                    const crewInSameModule = get().crew.filter(
                        (cr) =>
                            cr.moduleId === c.moduleId &&
                            cr.id !== c.id &&
                            cr.happiness < (cr.maxHappiness || 100),
                    );
                    if (crewInSameModule.length > 0) {
                        set((s) => ({
                            crew: s.crew.map((cr) =>
                                cr.moduleId === c.moduleId && cr.id !== c.id
                                    ? {
                                          ...cr,
                                          happiness: Math.min(
                                              cr.maxHappiness || 100,
                                              cr.happiness + moraleBonus,
                                          ),
                                      }
                                    : cr,
                            ),
                        }));
                        get().addLog(
                            `★ ${c.name} (${trait.name}): +${moraleBonus} настроения модулю`,
                            "info",
                        );
                    }
                }
            });
        });

        // Remove unhappy crew
        const unhappyCrew = get().crew.filter((c) => c.happiness === 0);
        unhappyCrew.forEach((c) => {
            get().addLog(`${c.name} покинул корабль!`, "error");
            set((s) => ({ crew: s.crew.filter((cr) => cr.id !== c.id) }));
        });

        // Scouting missions are now instant - no processing needed here
        // Old scouting mission processing code removed

        // Power check
        const power = get().getTotalPower();
        const boost = get().crew.find((c) => c.assignment === "power") ? 5 : 0;
        const consumption = get().getTotalConsumption();
        const available = power + boost - consumption;

        if (available < 0) {
            get().addLog("КРИТИЧНО: Недостаток энергии!", "error");
            set((s) => ({
                crew: s.crew.map((c) => ({
                    ...c,
                    happiness: Math.max(0, c.happiness - 10),
                })),
            }));
            if (Math.random() < 0.4) {
                const mod =
                    get().ship.modules[
                        Math.floor(Math.random() * get().ship.modules.length)
                    ];
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === mod.id
                                ? { ...m, health: Math.max(0, m.health - 15) }
                                : m,
                        ),
                    },
                }));
                get().addLog(`"${mod.name}" повреждён перегрузкой!`, "error");
            }
        }

        // Oxygen check
        if (get().crew.length > get().getCrewCapacity()) {
            get().addLog("КРИТИЧНО: Недостаток кислорода!", "error");
            set((s) => ({
                crew: s.crew.map((c) => ({
                    ...c,
                    health: Math.max(0, c.health - 20),
                })),
            }));
        }

        // ═══════════════════════════════════════════════════════════════
        // CURSED ARTIFACT EFFECTS - Price of power
        // ═══════════════════════════════════════════════════════════════
        const activeCursedArtifacts = state.artifacts.filter(
            (a) => a.cursed && a.effect.active,
        );

        activeCursedArtifacts.forEach((artifact) => {
            if (!artifact.negativeEffect) return;

            switch (artifact.negativeEffect.type) {
                case "happiness_drain": {
                    // Abyss Reactor: -X happiness per turn (except synthetics)
                    const drain = artifact.negativeEffect.value || 5;
                    set((s) => ({
                        crew: s.crew.map((c) => {
                            // Synthetics don't have morale/happiness
                            if (c.race === "synthetic") return c;
                            return {
                                ...c,
                                happiness: Math.max(0, c.happiness - drain),
                            };
                        }),
                    }));
                    get().addLog(
                        `⚛️ ${artifact.name}: -${drain} счастья`,
                        "warning",
                    );
                    break;
                }
                case "morale_drain": {
                    // Dark Shield: -X morale per turn (except synthetics)
                    const drain = artifact.negativeEffect.value || 3;
                    set((s) => ({
                        crew: s.crew.map((c) => {
                            // Synthetics don't have morale/happiness
                            if (c.race === "synthetic") return c;
                            return {
                                ...c,
                                happiness: Math.max(0, c.happiness - drain),
                            };
                        }),
                    }));
                    get().addLog(
                        `🛡️ ${artifact.name}: команда чувствует холод`,
                        "warning",
                    );
                    break;
                }
                case "module_damage": {
                    // Black Box: random module damage per turn
                    const dmg = artifact.negativeEffect.value || 10;
                    const activeMods = state.ship.modules.filter(
                        (m) => m.health > 10,
                    );
                    if (activeMods.length > 0) {
                        const randomMod =
                            activeMods[
                                Math.floor(Math.random() * activeMods.length)
                            ];
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                modules: s.ship.modules.map((m) =>
                                    m.id === randomMod.id
                                        ? {
                                              ...m,
                                              health: Math.max(
                                                  10,
                                                  m.health - dmg,
                                              ),
                                          }
                                        : m,
                                ),
                            },
                        }));
                        get().addLog(
                            `📦 ${artifact.name}: "${randomMod.name}" повреждён`,
                            "warning",
                        );
                    }
                    break;
                }
                case "crew_desertion": {
                    // Parasitic Nanites: chance crew leaves
                    const chance = (artifact.negativeEffect.value || 5) / 100;
                    if (Math.random() < chance && state.crew.length > 1) {
                        const leavingIdx = Math.floor(
                            Math.random() * state.crew.length,
                        );
                        const leaving = state.crew[leavingIdx];
                        set((s) => ({
                            crew: s.crew.filter((_, i) => i !== leavingIdx),
                        }));
                        get().addLog(
                            `🔧 ${artifact.name}: ${leaving.name} покинул корабль!`,
                            "error",
                        );
                    }
                    break;
                }
                case "crew_mutation": {
                    // Ancient Biosphere: chance to mutate each crew member
                    const mutationChance =
                        (artifact.negativeEffect.value || 15) / 100;
                    const mutations = CREW_TRAITS.mutation;
                    let mutated = false;

                    state.crew.forEach((c) => {
                        if (
                            Math.random() < mutationChance &&
                            !c.traits.some((t) => t.name.startsWith("Мутация:"))
                        ) {
                            const mutation =
                                mutations[
                                    Math.floor(Math.random() * mutations.length)
                                ];
                            set((s) => ({
                                crew: s.crew.map((crew) =>
                                    crew.id === c.id
                                        ? {
                                              ...crew,
                                              traits: [
                                                  ...crew.traits,
                                                  {
                                                      name: mutation.name,
                                                      desc: mutation.desc,
                                                      effect: mutation.effect as unknown as Record<
                                                          string,
                                                          number
                                                      >,
                                                      type: "neutral" as const,
                                                  },
                                              ],
                                          }
                                        : crew,
                                ),
                            }));
                            get().addLog(
                                `🧬 ${artifact.name}: ${c.name} мутировал! ${mutation.name}`,
                                "warning",
                            );
                            mutated = true;
                        }
                    });

                    if (!mutated && Math.random() < 0.3) {
                        get().addLog(
                            `🧬 ${artifact.name}: ДНК экипажа стабилен... пока`,
                            "info",
                        );
                    }
                    break;
                }
                case "health_drain": {
                    // Void Drive: health drain per turn
                    const drain = artifact.negativeEffect.value || 5;
                    const immortalArtifact = state.artifacts.find(
                        (a) =>
                            a.effect.type === "crew_immortal" &&
                            a.effect.active,
                    );
                    const undyingArtifact = state.artifacts.find(
                        (a) =>
                            a.effect.type === "undying_crew" && a.effect.active,
                    );

                    set((s) => ({
                        crew: s.crew.map((c) => ({
                            ...c,
                            health: Math.max(
                                immortalArtifact || undyingArtifact ? 1 : 0,
                                c.health - drain,
                            ),
                        })),
                    }));
                    get().addLog(
                        `🌀 ${artifact.name}: -${drain} здоровья экипажу`,
                        "warning",
                    );
                    break;
                }
            }
        });

        // Auto-repair from Parasitic Nanites (positive effect)
        const autoRepair = state.artifacts.find(
            (a) => a.effect.type === "auto_repair" && a.effect.active,
        );
        if (autoRepair) {
            const repairAmount = getArtifactEffectValue(autoRepair, state);
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) => ({
                        ...m,
                        health: Math.min(100, m.health + repairAmount),
                    })),
                },
            }));
            get().addLog(
                `🔧 Паразитические Наниты: ремонт +${repairAmount}%`,
                "info",
            );
        }

        // Abyss Power positive effect (already handled in getTotalPower)
        // Just log it if active
        const abyssReactor = state.artifacts.find(
            (a) => a.effect.type === "abyss_power" && a.effect.active,
        );
        if (abyssReactor) {
            get().addLog(
                `⚛️ Реактор Бездны: +${abyssReactor.effect.value || 15}⚡`,
                "info",
            );
        }

        get().updateShipStats();
        get().saveGame(); // Auto-save after each turn
    },

    skipTurn: () => {
        const state = get();
        get().addLog("Ход пропущен - задачи выполняются", "info");

        // Enemy still attacks when we skip
        if (state.currentCombat) {
            // Execute enemy attack
            const eDmg = state.currentCombat.enemy.modules.reduce(
                (s, m) => s + (m.damage || 0),
                0,
            );

            if (eDmg > 0) {
                // Pick random target module
                const activeMods = state.ship.modules.filter(
                    (m) => !m.disabled && m.health > 0,
                );
                const tgt =
                    activeMods[Math.floor(Math.random() * activeMods.length)];

                if (tgt) {
                    // Apply shield and armor damage reduction
                    let remainingDamage = eDmg;

                    // Shields absorb first
                    if (state.ship.shields > 0) {
                        const shieldAbsorb = Math.min(
                            state.ship.shields,
                            remainingDamage,
                        );
                        set((s) => ({
                            ship: {
                                ...s.ship,
                                shields: s.ship.shields - shieldAbsorb,
                            },
                        }));
                        remainingDamage -= shieldAbsorb;
                    }

                    // Armor reduces remaining damage
                    if (remainingDamage > 0) {
                        const shipDefense = state.ship.armor || 0;
                        remainingDamage = Math.max(
                            1,
                            remainingDamage - shipDefense,
                        );
                    }

                    // const wasDestroyed = tgt.health <= remainingDamage;

                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m) =>
                                m.id === tgt.id
                                    ? {
                                          ...m,
                                          health: Math.max(
                                              0,
                                              m.health - remainingDamage,
                                          ),
                                      }
                                    : m,
                            ),
                        },
                    }));

                    get().addLog(
                        `Враг по "${tgt.name}": -${remainingDamage}%`,
                        "warning",
                    );

                    // Damage crew in module
                    const crewDamage = Math.floor(remainingDamage * 0.5);
                    const crewInModule = state.crew.filter(
                        (c) => c.moduleId === tgt.id,
                    );
                    if (crewInModule.length > 0) {
                        set((s) => ({
                            crew: s.crew.map((c) =>
                                c.moduleId === tgt.id
                                    ? {
                                          ...c,
                                          health: Math.max(
                                              0,
                                              c.health - crewDamage,
                                          ),
                                      }
                                    : c,
                            ),
                        }));
                        get().addLog(
                            `👤 Экипаж получил урон: -${crewDamage}`,
                            "warning",
                        );
                    }

                    // Check for dead crew
                    const deadCrew = get().crew.filter((c) => c.health <= 0);
                    if (deadCrew.length > 0) {
                        set((s) => ({
                            crew: s.crew.filter((c) => c.health > 0),
                        }));
                        get().addLog(
                            `☠️ Потери: ${deadCrew.map((c) => c.name).join(", ")}`,
                            "error",
                        );
                    }
                }
            }
        }

        // Update ship stats and check for game over AFTER all damage is applied
        get().updateShipStats();
        get().checkGameOver();

        get().nextTurn();
    },

    selectSector: (sectorId) => {
        const state = get();
        const cockpit = state.ship.modules.find(
            (m) => m.type === "cockpit" && !m.disabled,
        );
        if (!cockpit) {
            get().addLog(
                "Кабина отключена! Невозможно управлять кораблем!",
                "error",
            );
            playSound("error");
            return;
        }
        if (state.traveling) return;

        const sector = state.galaxy.sectors.find((s) => s.id === sectorId);
        if (!sector) return;

        // Если уже в этом секторе - просто открываем карту сектора
        if (sectorId === state.currentSector?.id) {
            set({ gameMode: "sector_map" });
            return;
        }

        // Check if engines or fuel tanks are damaged
        const enginesWorking = get().areEnginesFunctional();
        const tanksWorking = get().areFuelTanksFunctional();

        // If engines or tanks are damaged, can only travel in tier 1
        if ((!enginesWorking || !tanksWorking) && sector.tier > 1) {
            get().addLog(
                `Двигатели или баки повреждены! Доступен только Тир 1`,
                "error",
            );
            playSound("error");
            return;
        }

        // Check tier access requirements (only when traveling to new sector)
        const engines = state.ship.modules.filter(
            (m) => m.type === "engine" && !m.disabled && m.health > 0,
        );
        const engineLevel =
            engines.length > 0
                ? Math.max(...engines.map((e) => e.level || 1))
                : 1;
        const captainLevel =
            state.crew.find((c) => c.profession === "pilot")?.level ?? 1;

        if (sector.tier === 2 && (engineLevel < 2 || captainLevel < 2)) {
            get().addLog(
                `Доступ к Тир 2 требует: Двигатель Ур.2 + Капитан Ур.2`,
                "error",
            );
            playSound("error");
            return;
        }

        if (sector.tier === 3 && (engineLevel < 3 || captainLevel < 3)) {
            get().addLog(
                `Доступ к Тир 3 требует: Двигатель Ур.3 + Капитан Ур.3`,
                "error",
            );
            playSound("error");
            return;
        }

        // Check tier 4 access - VICTORY CONDITION
        if (sector.tier === 4) {
            const hasTier4Engine = state.ship.modules.some(
                (m) =>
                    m.type === "engine" &&
                    !m.disabled &&
                    m.health > 0 &&
                    (m.level || 1) >= 4,
            );
            if (engineLevel < 4 || captainLevel < 4 || !hasTier4Engine) {
                get().addLog(
                    `Доступ к Тир 4 требует: Двигатель Ур.4 + Капитан Ур.4`,
                    "error",
                );
                playSound("error");
                return;
            }
            // VICTORY! Player reached the edge of the galaxy
            get().triggerVictory();
            return;
        }

        // Check if pilot is in cockpit for bonuses
        const pilot = state.crew.find((c) => c.profession === "pilot");
        const pilotInCockpit = pilot && pilot.moduleId === cockpit.id;

        // Check for void_engine artifact (free fuel for inter-sector travel)
        // Both regular void_engine and cursed void_drive artifacts
        const voidEngine = state.artifacts.find(
            (a) =>
                (a.effect.type === "fuel_free" ||
                    a.effect.type === "void_engine") &&
                a.effect.active,
        );

        // Check for warp_coil artifact (instant inter-sector travel)
        const warpCoil = state.artifacts.find(
            (a) => a.effect.type === "sector_teleport" && a.effect.active,
        );

        // Calculate fuel cost with penalty if pilot not in cockpit
        let fuelCost = get().calculateFuelCost(sector.tier);
        let travelInstant = false;

        // Apply void_engine artifact bonus (free inter-sector travel)
        if (voidEngine) {
            fuelCost = 0;
            const artifactName = voidEngine.cursed
                ? "Варп Бездны"
                : "Вакуумный двигатель";
            get().addLog(
                `⚡ ${artifactName}! Бесплатный межсекторный перелёт!`,
                "info",
            );

            // Apply crew health drain for cursed void_engine (Void Drive)
            if (
                voidEngine.cursed &&
                voidEngine.negativeEffect?.type === "health_drain"
            ) {
                const negativeValue = voidEngine.negativeEffect?.value || 5;
                set((s) => ({
                    crew: s.crew.map((c) => ({
                        ...c,
                        health: Math.max(1, c.health - negativeValue),
                    })),
                }));
                get().addLog(
                    `⚠️ ${artifactName}: Экипаж пострадал на -${negativeValue} здоровья`,
                    "warning",
                );
            }
        }

        // Apply warp_coil artifact bonus (instant inter-sector travel - no turn)
        if (warpCoil) {
            travelInstant = true;
            get().addLog(
                `⚡ Варп-Катушка! Мгновенный межсекторный перелёт!`,
                "info",
            );
        } else if (!pilotInCockpit) {
            fuelCost = Math.floor(fuelCost * 1.5); // 50% more fuel
            get().addLog(`⚠ Пилот не в кабине! Расход топлива +50%`, "warning");
        }

        if (state.ship.fuel < fuelCost) {
            get().addLog(
                `Недостаточно топлива! Нужно: ${fuelCost}, есть: ${state.ship.fuel}`,
                "error",
            );
            playSound("error");
            return;
        }

        // Consume fuel
        set((s) => ({
            ship: {
                ...s.ship,
                fuel: Math.max(0, (s.ship.fuel || 0) - fuelCost),
            },
        }));
        if (fuelCost > 0) {
            get().addLog(`Расход топлива: -${fuelCost}`, "info");
        } else {
            get().addLog(`Расход топлива: Бесплатно`, "info");
        }

        // Risk of module damage if pilot not in cockpit during inter-tier travel
        const distance = Math.abs(
            sector.tier - (state.currentSector?.tier ?? 1),
        );

        if (!pilotInCockpit && distance > 0) {
            // 30% chance per tier distance of module damage
            const damageChance = 0.3 * distance;
            if (Math.random() < damageChance) {
                const activeModules = state.ship.modules.filter(
                    (m) => m.health > 10,
                );
                if (activeModules.length > 0) {
                    const damagedModule =
                        activeModules[
                            Math.floor(Math.random() * activeModules.length)
                        ];
                    const damage = 10 + Math.floor(Math.random() * 15);
                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m) =>
                                m.id === damagedModule.id
                                    ? {
                                          ...m,
                                          health: Math.max(
                                              10,
                                              m.health - damage,
                                          ),
                                      }
                                    : m,
                            ),
                        },
                    }));
                    get().addLog(
                        `⚠ Навигационная ошибка! "${damagedModule.name}" повреждён: -${damage}%`,
                        "error",
                    );
                }
            }
        }

        playSound("travel");

        if (distance === 0) {
            if (pilot) get().gainExp(pilot, 5);
            // Mark sector as visited
            set((s) => ({
                currentSector: { ...sector, visited: true },
                galaxy: {
                    ...s.galaxy,
                    sectors: s.galaxy.sectors.map((sec) =>
                        sec.id === sector.id ? { ...sec, visited: true } : sec,
                    ),
                },
            }));
            get().addLog(`Перелёт в ${sector.name}`, "info");
            if (!travelInstant) {
                get().nextTurn();
            }
            set({ gameMode: "sector_map" });
        } else {
            if (pilot) get().gainExp(pilot, distance * 15);
            // Mark sector as visited
            set((s) => ({
                traveling: travelInstant
                    ? null
                    : {
                          destination: sector,
                          turnsLeft: distance,
                          turnsTotal: distance,
                      },
                gameMode: "galaxy_map",
                galaxy: {
                    ...s.galaxy,
                    sectors: s.galaxy.sectors.map((sec) =>
                        sec.id === sector.id ? { ...sec, visited: true } : sec,
                    ),
                },
            }));
            if (travelInstant) {
                // Instant travel - arrive immediately
                set(() => ({
                    currentSector: { ...sector, visited: true },
                    gameMode: "sector_map",
                }));
                get().addLog(`⚡ Мгновенный перелёт в ${sector.name}!`, "info");
            } else {
                get().addLog(
                    `Начато путешествие в ${sector.name} (${distance} ходов)`,
                    "info",
                );
                get().nextTurn();
            }
        }
    },

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
                const locIndex = sector.locations.findIndex(
                    (l) => l.id === loc.id,
                );
                if (locIndex !== -1) {
                    sector.locations[locIndex].visited = true;
                }
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
                        const expReward = CONTRACT_REWARDS.diplomacy.baseExp;
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

                // Complete scan_planet contracts - return to source planet after scanning
                const scanComplete = get().activeContracts.filter(
                    (c) =>
                        c.type === "scan_planet" &&
                        c.sourcePlanetId === loc.id &&
                        c.visited &&
                        c.visited >= 1,
                );
                scanComplete.forEach((c) => {
                    set((s) => ({
                        credits: s.credits + (c.reward || 0),
                        completedContractIds: [...s.completedContractIds, c.id],
                        activeContracts: s.activeContracts.filter(
                            (ac) => ac.id !== c.id,
                        ),
                    }));
                    get().addLog(
                        `📡 Контракт выполнен: ${c.desc} +${c.reward}₢`,
                        "info",
                    );
                    // Give experience to all crew members
                    const expReward = CONTRACT_REWARDS.scan_planet.baseExp;
                    giveCrewExperience(
                        expReward,
                        `Экипаж получил опыт: +${expReward} ед.`,
                    );
                });

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
                                                      g.quantity - requiredQty,
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
                        const expReward = CONTRACT_REWARDS.supply_run.baseExp;
                        giveCrewExperience(
                            expReward,
                            `Экипаж получил опыт: +${expReward} ед.`,
                        );
                    }
                });
                break;
            case "enemy": {
                // Check scanner level vs enemy threat level
                const scannerLevel = get().getScanLevel();
                const scannerRange = get().getScanRange();
                const enemyTier = loc.threat || 1;
                const needsScanner = scannerLevel < enemyTier;

                if (needsScanner && !loc.signalRevealed) {
                    // Early warning system: chance to detect ambush with high scanRange
                    // Base 10% + 3% per point of scanRange above 3
                    const earlyWarningChance = Math.min(
                        80,
                        10 + (scannerRange - 3) * 3,
                    );
                    const detected = Math.random() * 100 < earlyWarningChance;

                    if (detected && scannerRange > 3) {
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
                const scannerLevel = get().getScanLevel();
                const scannerRange = get().getScanRange();
                const needsScanner = scannerLevel < 3;

                if (needsScanner && !loc.signalRevealed) {
                    // Early warning for boss: chance to detect with high scanRange
                    // Base 5% + 2% per point of scanRange above 8
                    const earlyWarningChance = Math.min(
                        60,
                        5 + (scannerRange - 8) * 2,
                    );
                    const detected = Math.random() * 100 < earlyWarningChance;

                    if (detected && scannerRange > 8) {
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
                // Check scanner level vs anomaly tier
                const scannerLevel = get().getScanLevel();
                const anomalyTier = loc.anomalyTier || 1;
                const needsScanner = scannerLevel < anomalyTier;

                if (needsScanner && !loc.signalRevealed) {
                    set({ gameMode: "unknown_ship" });
                } else {
                    // Always open anomaly panel, let AnomalyPanel handle scientist check
                    set({ gameMode: "anomaly" });
                }
                break;
            }
            case "friendly_ship": {
                // Check scanner level (friendly ships are tier 1)
                const scannerLevel = get().getScanLevel();
                const needsScanner = scannerLevel < 1;

                if (needsScanner && !loc.signalRevealed) {
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
                // Don't reveal storm yet - only reveal when we actually enter it
                set({ currentLocation: loc, gameMode: "storm" });
                break;
            case "distress_signal":
                // Check scanner for reveal chance (one-time check)
                if (!loc.signalRevealChecked) {
                    const scanLevel = get().getScanLevel();
                    const scanRange = get().getScanRange();

                    // Base reveal chances by scanner level: LV1=15%, LV2=30%, LV3=50%, LV4=75%
                    let revealChance = 0;
                    if (scanLevel >= 4) revealChance = 75;
                    else if (scanLevel >= 3) revealChance = 50;
                    else if (scanLevel >= 2) revealChance = 30;
                    else if (scanLevel >= 1) revealChance = 15;

                    // Bonus from numeric scanRange: +2% per point above base requirement
                    // Scanner MK-1 (base 3): +2% per point above 3
                    // Scanner MK-2 (base 5): +2% per point above 5
                    // Scanner MK-3 (base 8): +2% per point above 8
                    // Quantum (base 15): +2% per point above 15
                    let baseRequirement = 0;
                    if (scanLevel >= 4) baseRequirement = 15;
                    else if (scanLevel >= 3) baseRequirement = 8;
                    else if (scanLevel >= 2) baseRequirement = 5;
                    else if (scanLevel >= 1) baseRequirement = 3;

                    if (scanRange > baseRequirement) {
                        const rangeBonus = (scanRange - baseRequirement) * 2;
                        revealChance = Math.min(95, revealChance + rangeBonus);
                    }

                    const canReveal = Math.random() * 100 < revealChance;

                    if (canReveal && !loc.signalType) {
                        // Determine outcome and reveal it
                        // Eye of Singularity increases ambush chance by 50%
                        const allSeeing = state.artifacts.find(
                            (a) =>
                                a.effect.type === "all_seeing" &&
                                a.effect.active,
                        );
                        const ambushModifier = allSeeing ? 0.5 : 0;
                        const outcome = determineSignalOutcome(ambushModifier);
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
                                      locations: s.currentSector.locations.map(
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
                                      locations: s.currentSector.locations.map(
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
        const state = get();
        const currentSector = state.currentSector;

        // Check if current sector has a black hole
        if (!currentSector || currentSector.star?.type !== "blackhole") {
            get().addLog("В этом секторе нет чёрной дыры!", "error");
            return;
        }

        // Find other black holes
        const otherBlackHoles = state.galaxy.sectors.filter(
            (s) => s.star?.type === "blackhole" && s.id !== currentSector.id,
        );

        if (otherBlackHoles.length === 0) {
            get().addLog("Нет другой чёрной дыры для телепортации!", "error");
            return;
        }

        // Pick random destination black hole
        const destination =
            otherBlackHoles[Math.floor(Math.random() * otherBlackHoles.length)];

        // Check for scientist to reduce damage
        const scientist = state.crew.find((c) => c.profession === "scientist");
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
            const randomIdx = Math.floor(Math.random() * damagedModules.length);
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
        get().addLog(`Экипаж пострадал: -${baseCrewDamage} здоровья`, "error");

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
        const resources = loc.resources || { minerals: 0, rare: 0, credits: 0 };
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
        // const bonusPercent = Math.round((efficiencyBonus - 1) * 100);

        const mineralsGained = Math.floor(resources.minerals * efficiencyBonus);
        const rareGained = Math.floor(resources.rare * efficiencyBonus);
        const creditsGained = Math.floor(resources.credits * efficiencyBonus);

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
                addedMinerals = Math.max(1, Math.floor(mineralsGained * scale));
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
        const engineer = state.crew.find((c) => c.profession === "engineer");
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
                          l.id === loc.id ? { ...l, signalRevealed: true } : l,
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

        switch (stormType) {
            case "radiation":
                crewDamage = (15 + Math.random() * 15) * intensity;
                moduleDamage = (5 + Math.random() * 10) * intensity;
                lootMultiplier = 2;
                break;
            case "ionic":
                shieldDamage = (30 + Math.random() * 30) * intensity;
                moduleDamage = (10 + Math.random() * 15) * intensity;
                lootMultiplier = 2.5;
                break;
            case "plasma":
                shieldDamage = (20 + Math.random() * 20) * intensity;
                moduleDamage = (15 + Math.random() * 20) * intensity;
                crewDamage = (10 + Math.random() * 10) * intensity;
                lootMultiplier = 3;
                break;
        }

        // Apply shield damage
        const newShields = Math.max(0, state.ship.shields - shieldDamage);

        // Apply module damage to random modules
        const damagedModules = [...state.ship.modules];
        const numModulesToDamage = Math.floor(Math.random() * 2) + 1;
        const modulesDamagedList: { name: string; damage: number }[] = [];
        for (let i = 0; i < numModulesToDamage; i++) {
            const randomIdx = Math.floor(Math.random() * damagedModules.length);
            const damage = Math.floor(moduleDamage);
            damagedModules[randomIdx] = {
                ...damagedModules[randomIdx],
                health: Math.max(10, damagedModules[randomIdx].health - damage),
            };
            modulesDamagedList.push({
                name: damagedModules[randomIdx].name,
                damage: damage,
            });
        }

        // Apply crew damage
        const damagedCrew = state.crew.map((c) => ({
            ...c,
            health: Math.max(10, c.health - Math.floor(crewDamage)),
            happiness: Math.max(0, c.happiness - 10),
        }));

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

        // Apply changes
        set((s) => ({
            ship: { ...s.ship, shields: newShields, modules: damagedModules },
            crew: damagedCrew,
            credits: s.credits + baseLoot + rareBonus,
            stormResult: {
                stormName: loc.name,
                stormType,
                intensity,
                shieldDamage: Math.floor(shieldDamage),
                moduleDamage: modulesDamagedList,
                moduleDamagePercent: Math.floor(moduleDamage),
                numModulesDamaged: numModulesToDamage,
                crewDamage: Math.floor(crewDamage),
                creditsEarned: baseLoot + rareBonus,
                rareLoot,
                rareBonus: rareLoot ? rareBonus : undefined,
            },
            gameMode: "storm_results",
        }));

        playSound("combat");

        // Give scientist experience for studying the storm
        const scientist = state.crew.find((c) => c.profession === "scientist");
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
            set((s) => ({ credits: s.credits + (rescueContract.reward || 0) }));
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

    startCombat: (enemy, isAmbush = false) => {
        playSound("combat");
        const enemyMods: Array<{
            id: number;
            type: string;
            name: string;
            health: number;
            damage: number;
            defense: number;
        }> = [];
        const num = (enemy.threat || 1) + 2;
        const threat = enemy.threat || 1;

        // Always add at least one weapon module first
        enemyMods.push({
            id: 0,
            type: "weapon",
            name: "Оружие",
            health: 100,
            damage: threat * 8,
            defense: 0,
        });

        // Add remaining modules
        for (let i = 1; i < num; i++) {
            const types = ["weapon", "shield", "reactor"];
            const type = types[Math.floor(Math.random() * types.length)];
            // Defense: 1-3 for normal enemies, 5-10 for bosses
            const defenseValue =
                type === "shield" ? Math.min(3, Math.ceil(threat / 2)) : 0;
            enemyMods.push({
                id: i,
                type,
                name:
                    type === "weapon"
                        ? "Оружие"
                        : type === "shield"
                          ? "Щит"
                          : "Реактор",
                health: 100,
                damage: type === "weapon" ? threat * 8 : 0,
                defense: defenseValue,
            });
        }

        set((s) => ({
            ship: { ...s.ship, shields: s.ship.maxShields },
            currentCombat: {
                enemy: {
                    name: enemy.name,
                    modules: enemyMods,
                    selectedModule: null,
                    shields: (enemy.threat || 1) * 20,
                    maxShields: (enemy.threat || 1) * 20,
                    threat: enemy.threat || 1,
                },
                loot: { credits: (enemy.threat || 1) * 100 },
                isAmbush,
                ambushAttackDone: false,
            },
            gameMode: "combat",
        }));
        get().addLog(`Щиты восстановлены: ${get().ship.shields}`, "combat");

        if (isAmbush) {
            get().addLog(`⚠️ ЗАСАДА! ${enemy.name} атакует первым!`, "error");
            // Execute enemy attack immediately for ambush
            get().executeAmbushAttack();
        } else {
            get().addLog(`Бой с ${enemy.name}!`, "combat");
        }

        // Apply combatStartMoraleDrain trait (Пессимист: -20 морали в первый ход боя модулю)
        const crewWithPessimist = get().crew.filter((c) =>
            c.traits?.some((t) => t.effect.combatStartMoraleDrain),
        );
        crewWithPessimist.forEach((c) => {
            const trait = c.traits.find((t) => t.effect.combatStartMoraleDrain);
            if (trait) {
                const moraleDrain = trait.effect
                    .combatStartMoraleDrain as number;
                const crewInSameModule = get().crew.filter(
                    (cr) =>
                        cr.moduleId === c.moduleId &&
                        cr.id !== c.id &&
                        cr.happiness > 0,
                );
                if (crewInSameModule.length > 0) {
                    set((s) => ({
                        crew: s.crew.map((cr) =>
                            cr.moduleId === c.moduleId && cr.id !== c.id
                                ? {
                                      ...cr,
                                      happiness: Math.max(
                                          0,
                                          cr.happiness - moraleDrain,
                                      ),
                                  }
                                : cr,
                        ),
                    }));
                    get().addLog(
                        `⚠️ ${c.name} (${trait.name}): -${moraleDrain} морали модулю в начале боя`,
                        "warning",
                    );
                }
            }
        });
    },

    startBossCombat: (bossLocation) => {
        playSound("combat");
        const bossData = getBossById(bossLocation.bossId || "");
        if (!bossData) {
            get().addLog("Ошибка: данные босса не найдены!", "error");
            return;
        }

        // Convert boss modules to enemy modules
        const bossModules: EnemyModule[] = bossData.modules.map((m, idx) => ({
            id: idx,
            type: m.type,
            name: m.name,
            health: m.health,
            maxHealth: m.health,
            damage: m.damage || 0,
            defense: m.defense || 0,
            isAncient: m.isAncient,
            specialEffect: m.specialEffect,
        }));

        // Get random undiscovered artifact for guaranteed drop
        const artifact = getRandomUndiscoveredArtifact(get().artifacts);

        set((s) => ({
            ship: { ...s.ship, shields: s.ship.maxShields },
            currentCombat: {
                enemy: {
                    name: bossData.name,
                    modules: bossModules,
                    selectedModule: null,
                    shields: bossData.shields,
                    maxShields: bossData.shields,
                    isBoss: true,
                    bossId: bossData.id,
                    regenRate: bossData.regenRate,
                    specialAbility: bossData.specialAbility,
                },
                loot: {
                    credits: 500 * bossData.tier,
                    guaranteedArtifact: artifact?.id,
                },
            },
            gameMode: "combat",
        }));
        get().addLog(`⚠️ БОСС: ${bossData.name}!`, "warning");
        get().addLog(`"${bossData.description}"`, "info");
        get().addLog(`Регенерация: ${bossData.regenRate}% за ход`, "warning");
    },

    executeAmbushAttack: () => {
        const state = get();
        const combat = state.currentCombat;
        if (!combat) return;

        // Mark ambush as done
        set((s) => {
            if (!s.currentCombat) return s;
            return {
                currentCombat: {
                    ...s.currentCombat,
                    ambushAttackDone: true,
                },
            };
        });

        // Calculate enemy damage (only from alive modules)
        const eDmg = combat.enemy.modules.reduce(
            (s, m) => s + (m.health > 0 ? m.damage || 0 : 0),
            0,
        );

        // Skip attack if enemy has no damage (all weapon modules destroyed)
        if (eDmg <= 0) {
            get().addLog(
                `⚠️ Враг не может атаковать - все орудия уничтожены!`,
                "info",
            );
            return;
        }

        // Select target module (same AI as normal attack)
        const activeMods = state.ship.modules.filter((m) => m.health > 0);

        const getModuleTargetPriority = (m: Module): number => {
            let priority = 0;
            const crewInModule = get().crew.filter((c) => c.moduleId === m.id);

            switch (m.type) {
                case "weaponbay":
                    priority = 100;
                    break;
                case "cockpit":
                    priority = 90;
                    break;
                case "reactor":
                    priority = 85;
                    break;
                case "engine":
                    priority = 70;
                    break;
                case "shield":
                    priority = 60;
                    break;
                case "lifesupport":
                    priority = 50;
                    break;
                case "fueltank":
                    priority = 45;
                    break;
                case "medical":
                    priority = 40;
                    break;
                case "cargo":
                    priority = 20;
                    break;
                case "scanner":
                    priority = 15;
                    break;
                case "drill":
                    priority = 5;
                    break;
                default:
                    priority = 30;
            }

            if (m.health < 30) priority += 30;
            else if (m.health < 50) priority += 15;
            else if (m.health < 70) priority += 5;

            priority += crewInModule.length * 10;
            priority += Math.random() * 20;

            return priority;
        };

        let tgt: Module | null = null;
        if (activeMods.length > 0) {
            const sortedMods = [...activeMods].sort(
                (a, b) =>
                    getModuleTargetPriority(b) - getModuleTargetPriority(a),
            );
            tgt = sortedMods[0];
        }

        // Apply damage
        if (get().ship.shields > 0) {
            const sDmg = Math.min(get().ship.shields, eDmg);
            set((s) => ({
                ship: { ...s.ship, shields: s.ship.shields - sDmg },
            }));
            get().addLog(`Враг атакует из засады! Щиты: -${sDmg}`, "error");
            const overflow = eDmg - sDmg;
            if (overflow > 0 && tgt) {
                const reducedDamage = Math.floor(overflow * 0.8); // Slightly reduced for gameplay
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === tgt.id
                                ? {
                                      ...m,
                                      health: Math.max(
                                          0,
                                          m.health - reducedDamage,
                                      ),
                                  }
                                : m,
                        ),
                    },
                }));
                get().addLog(
                    `Пробитие! "${tgt.name}": -${reducedDamage}%`,
                    "error",
                );
            }
        } else if (tgt) {
            const reducedDamage = Math.floor(eDmg * 0.8);
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) =>
                        m.id === tgt.id
                            ? {
                                  ...m,
                                  health: Math.max(0, m.health - reducedDamage),
                              }
                            : m,
                    ),
                },
            }));
            get().addLog(
                `Враг атакует из засады! "${tgt.name}": -${reducedDamage}%`,
                "error",
            );
        }

        // Damage crew in targeted module
        if (tgt) {
            const crewInModule = state.crew.filter(
                (c) => c.moduleId === tgt.id,
            );
            if (crewInModule.length > 0) {
                const crewDamage = 15;
                set((s) => ({
                    crew: s.crew.map((c) =>
                        c.moduleId === tgt.id
                            ? {
                                  ...c,
                                  health: Math.max(0, c.health - crewDamage),
                              }
                            : c,
                    ),
                }));
                get().addLog(
                    `Экипаж в "${tgt.name}" получил урон: -${crewDamage}`,
                    "warning",
                );

                // Check for dead crew
                const deadCrew = get().crew.filter((c) => c.health <= 0);
                if (deadCrew.length > 0) {
                    set((s) => ({ crew: s.crew.filter((c) => c.health > 0) }));
                    get().addLog(
                        `☠️ Потери: ${deadCrew.map((c) => c.name).join(", ")}`,
                        "error",
                    );
                    get().checkGameOver();
                }
            }
        }
    },

    selectEnemyModule: (moduleId) => {
        const state = get();

        // Check if any crew is in a weapon bay with targeting assignment (combat assignment during battle)
        const weaponBays = state.ship.modules.filter(
            (m) => m.type === "weaponbay" && !m.disabled && m.health > 0,
        );
        const hasGunnerInWeaponBay = state.crew.some(
            (c) =>
                weaponBays.some((wb) => wb.id === c.moduleId) &&
                getActiveAssignment(c, true) === "targeting",
        );

        if (!hasGunnerInWeaponBay) {
            get().addLog(
                "Нужен наводчик в оружейной для выбора цели!",
                "warning",
            );
            return;
        }

        set((s) => {
            if (!s.currentCombat) return s;
            const mod = s.currentCombat.enemy.modules.find(
                (m) => m.id === moduleId,
            );
            if (mod && mod.health > 0) {
                return {
                    currentCombat: {
                        ...s.currentCombat,
                        enemy: {
                            ...s.currentCombat.enemy,
                            selectedModule: moduleId,
                        },
                    },
                };
            }
            return s;
        });
    },

    attackEnemy: () => {
        const state = get();
        if (!state.currentCombat) return;

        // Check if any crew is in a weapon bay for accuracy bonuses
        const weaponBays = state.ship.modules.filter(
            (m) => m.type === "weaponbay" && !m.disabled && m.health > 0,
        );
        const crewInWeaponBays = state.crew.filter(
            (c) =>
                weaponBays.some((wb) => wb.id === c.moduleId) &&
                (c.profession === "gunner" ||
                    c.profession === "engineer" ||
                    (c.profession === "pilot" &&
                        getActiveAssignment(c, true) === "targeting")),
        );
        const hasGunner = crewInWeaponBays.some(
            (c) => c.profession === "gunner",
        );
        const hasEngineer = crewInWeaponBays.some(
            (c) => c.profession === "engineer",
        );

        // Determine target - if no gunner, can't select target, random module
        let tgtMod = state.currentCombat.enemy.modules.find(
            (m) => m.id === state?.currentCombat?.enemy.selectedModule,
        );

        if (!hasGunner) {
            // Without gunner, attack random alive module
            const aliveModules = state.currentCombat.enemy.modules.filter(
                (m) => m.health > 0,
            );
            if (aliveModules.length === 0) return;
            tgtMod =
                aliveModules[Math.floor(Math.random() * aliveModules.length)];
            get().addLog(`Случайная цель: ${tgtMod.name}`, "warning");
        } else if (!tgtMod || tgtMod.health <= 0) {
            get().addLog("Выберите цель!", "error");
            return;
        }

        // Count weapons by type and calculate base damage per weapon
        const weaponCounts = { kinetic: 0, laser: 0, missile: 0 };
        const baseWeaponDamage = get().getTotalDamage().total;

        // Divide base damage among weapons (each weapon deals full base damage)
        state.ship.modules.forEach((m) => {
            if (m.type === "weaponbay" && m.weapons) {
                m.weapons.forEach((w) => {
                    if (w && WEAPON_TYPES[w.type]) {
                        weaponCounts[w.type]++;
                    }
                });
            }
        });

        const totalWeapons =
            weaponCounts.kinetic + weaponCounts.laser + weaponCounts.missile;
        if (totalWeapons === 0) return;

        // Base damage per weapon (each weapon deals full damage independently)
        const damagePerWeapon = baseWeaponDamage;

        // Apply gunner bonus to each weapon
        let finalDamagePerWeapon = hasGunner
            ? Math.floor(damagePerWeapon * 1.15)
            : Math.floor(damagePerWeapon * 0.5);

        // Apply crew combat assignments (during battle)
        const hasTargeting = state.crew.some(
            (c) => c.combatAssignment === "targeting",
        );
        const hasOverclock = state.crew.some(
            (c) => c.combatAssignment === "overclock",
        );
        const hasRapidfire = state.crew.some(
            (c) => c.combatAssignment === "rapidfire",
        );
        const hasMaintenance = state.crew.some(
            (c) => c.combatAssignment === "maintenance",
        );
        const hasCalibration = state.crew.some(
            (c) => c.combatAssignment === "calibration",
        );

        // Damage bonuses from assignments
        if (hasTargeting)
            finalDamagePerWeapon = Math.floor(finalDamagePerWeapon * 1.15);
        if (hasOverclock)
            finalDamagePerWeapon = Math.floor(finalDamagePerWeapon * 1.25);
        if (hasRapidfire)
            finalDamagePerWeapon = Math.floor(finalDamagePerWeapon * 1.25);

        // Apply critical_matrix artifact (35% crit chance for double damage)
        const criticalMatrix = state.artifacts.find(
            (a) => a.effect.type === "crit_chance" && a.effect.active,
        );
        let critMultiplier = 1;
        if (criticalMatrix) {
            const critChance = getArtifactEffectValue(criticalMatrix, state);
            if (Math.random() < critChance) {
                critMultiplier = 2;
                get().addLog(`💥 КРИТИЧЕСКИЙ УДАР! x2 урон!`, "combat");
            }
        }

        // Calculate accuracy modifier from crew assignments and traits
        let accuracyModifier = 0;

        // No gunner penalty: -20% accuracy (instead of -50% damage)
        if (!hasGunner) accuracyModifier -= 0.2;

        // Crew assignment modifiers
        if (hasTargeting) accuracyModifier += 0.05; // +5% accuracy from targeting
        if (hasRapidfire) accuracyModifier -= 0.05; // -5% accuracy from rapidfire
        if (hasMaintenance) accuracyModifier += 0.05; // +5% accuracy from maintenance
        if (hasCalibration && hasEngineer) accuracyModifier += 0.1; // +10% from engineer calibration

        // AI Core module bonus: +5% accuracy per AI core module
        const aiCoreModules = state.ship.modules.filter(
            (m) => m.type === "ai_core" && !m.disabled && m.health > 0,
        ).length;
        if (aiCoreModules > 0) {
            accuracyModifier += aiCoreModules * 0.05;
            get().addLog(`🤖 ИИ Ядро: +${aiCoreModules * 5}% точность`, "info");
        }

        // Targeting Core artifact bonus: +15% accuracy
        const targetingCore = state.artifacts.find(
            (a) => a.effect.type === "accuracy_boost" && a.effect.active,
        );
        if (targetingCore) {
            const accuracyBonus =
                getArtifactEffectValue(targetingCore, state) / 100;
            accuracyModifier += accuracyBonus;
            get().addLog(
                `🎯 Ядро Прицеливания: +${Math.round(accuracyBonus * 100)}% точность`,
                "info",
            );
        }

        // Crew trait modifiers (accuracyPenalty from "Плохой стрелок")
        state.crew.forEach((c) => {
            c.traits?.forEach((trait) => {
                if (trait.effect?.accuracyPenalty) {
                    accuracyModifier -= Number(trait.effect.accuracyPenalty);
                }
            });
        });

        // Base accuracy by weapon type
        const getWeaponAccuracy = (weaponType: string): number => {
            const baseAccuracy: Record<string, number> = {
                laser: 0.95, // 95% base accuracy
                kinetic: 0.9, // 90% base accuracy
                missile: 0.8, // 80% base accuracy (can be intercepted)
            };
            const base = baseAccuracy[weaponType] || 0.85;
            // Apply accuracy modifier (clamped between 50% and 100%)
            return Math.max(0.5, Math.min(1.0, base + accuracyModifier));
        };

        // Calculate damage by weapon type
        let totalShieldDamage = 0;
        let totalModuleDamage = 0;
        const logs: string[] = [];
        const missedShots = { laser: 0, kinetic: 0, missile: 0 };

        const enemyShields = state.currentCombat.enemy.shields;
        let remainingShields = enemyShields;

        // Process each weapon type independently
        // 1. Lasers: +20% damage vs shields, 95% base accuracy
        if (weaponCounts.laser > 0) {
            const laserAccuracy = getWeaponAccuracy("laser");
            for (let i = 0; i < weaponCounts.laser; i++) {
                if (Math.random() > laserAccuracy) {
                    missedShots.laser++;
                    continue; // Laser missed
                }
                const laserDmg = finalDamagePerWeapon * critMultiplier;
                const shieldDmg = Math.floor(laserDmg * 1.2); // +20% vs shields
                const actualShieldDmg = Math.min(remainingShields, shieldDmg);
                const overflow = shieldDmg - actualShieldDmg;

                remainingShields -= actualShieldDmg;
                totalShieldDamage += actualShieldDmg;
                totalModuleDamage += overflow;

                if (enemyShields > 0) {
                    logs.push(`Лазер: -${actualShieldDmg} щитам`);
                    if (overflow > 0) logs.push(`(перелёт: ${overflow})`);
                }
            }
        }

        // 2. Kinetic: -50% armor penetration, 90% base accuracy
        let kineticArmorPenetration = 0;
        if (weaponCounts.kinetic > 0) {
            kineticArmorPenetration = 0.5; // 50% armor ignore
            const kineticAccuracy = getWeaponAccuracy("kinetic");
            for (let i = 0; i < weaponCounts.kinetic; i++) {
                if (Math.random() > kineticAccuracy) {
                    missedShots.kinetic++;
                    continue; // Kinetic missed
                }
                const kineticDmg = finalDamagePerWeapon * critMultiplier;
                const shieldDmg = Math.min(remainingShields, kineticDmg);
                const overflow = kineticDmg - shieldDmg;

                remainingShields -= shieldDmg;
                totalShieldDamage += shieldDmg;
                // Kinetic overflow damage will be calculated with armor penetration
                totalModuleDamage += overflow;

                if (enemyShields > 0 && shieldDmg > 0) {
                    logs.push(`Кинетика: -${shieldDmg} щитам`);
                }
            }
        }

        // 3. Missiles: 80% base accuracy, can be intercepted
        if (weaponCounts.missile > 0) {
            const missileAccuracy = getWeaponAccuracy("missile");
            let missileInterceptedCount = 0;

            for (let i = 0; i < weaponCounts.missile; i++) {
                // First check if missile hits (accuracy)
                if (Math.random() > missileAccuracy) {
                    missedShots.missile++;
                    continue; // Missile missed
                }
                // Then check if missile is intercepted
                const baseInterceptChance = 0.2; // 20% base
                const actualInterceptChance = Math.max(
                    0.05,
                    Math.min(0.5, baseInterceptChance - accuracyModifier),
                );
                if (Math.random() < actualInterceptChance) {
                    missileInterceptedCount++;
                    continue; // Missile intercepted, no damage
                }
                const missileDmg = finalDamagePerWeapon * critMultiplier;
                const shieldDmg = Math.min(remainingShields, missileDmg);
                const overflow = missileDmg - shieldDmg;

                remainingShields -= shieldDmg;
                totalShieldDamage += shieldDmg;
                totalModuleDamage += overflow;

                if (enemyShields > 0 && shieldDmg > 0) {
                    logs.push(`Ракета: -${shieldDmg} щитам`);
                }
            }

            if (missileInterceptedCount > 0) {
                logs.push(`🛡️ ${missileInterceptedCount} ракета(ы) сбита(ы)!`);
            }
        }

        // Log missed shots
        if (missedShots.laser > 0) {
            logs.push(`❌ ${missedShots.laser} лазер(а) промахнул(ись)!`);
        }
        if (missedShots.kinetic > 0) {
            logs.push(
                `❌ ${missedShots.kinetic} кинетических снаряда промахнулось!`,
            );
        }
        if (missedShots.missile > 0) {
            logs.push(`❌ ${missedShots.missile} ракета(ы) промахнул(ись)!`);
        }

        // Apply shield damage
        if (totalShieldDamage > 0) {
            set((s) => {
                if (!s.currentCombat) return s;
                return {
                    currentCombat: {
                        ...s.currentCombat,
                        enemy: {
                            ...s.currentCombat.enemy,
                            shields: Math.max(
                                0,
                                enemyShields - totalShieldDamage,
                            ),
                        },
                    },
                };
            });
            get().addLog(`Урон щитам врага: ${totalShieldDamage}`, "combat");
        }

        // Apply module damage with armor penetration from kinetic weapons
        if (totalModuleDamage > 0 || weaponCounts.kinetic > 0) {
            let moduleDefense = tgtMod.defense || 0;

            // Apply kinetic armor penetration to total module damage
            if (weaponCounts.kinetic > 0 && kineticArmorPenetration > 0) {
                moduleDefense = Math.floor(
                    moduleDefense * (1 - kineticArmorPenetration),
                );
                logs.push(
                    `🛡 Броня снижена на 50%: ${tgtMod.defense} → ${moduleDefense}`,
                );
            }

            const finalDamage = Math.max(1, totalModuleDamage - moduleDefense);

            set((s) => {
                if (!s.currentCombat) return s;
                return {
                    currentCombat: {
                        ...s.currentCombat,
                        enemy: {
                            ...s.currentCombat.enemy,
                            modules: s.currentCombat.enemy.modules.map((m) =>
                                m.id === tgtMod.id
                                    ? {
                                          ...m,
                                          health: Math.max(
                                              0,
                                              m.health - finalDamage,
                                          ),
                                      }
                                    : m,
                            ),
                        },
                    },
                };
            });
            get().addLog(
                `Пробитие! Модуль "${tgtMod.name}": -${finalDamage}%${weaponCounts.kinetic > 0 ? ` (броня -${moduleDefense})` : ""}`,
                "combat",
            );
        }

        // Log individual weapon hits
        logs.forEach((log) => get().addLog(log, "combat"));

        // Check victory
        const updatedCombat = get().currentCombat;
        if (
            updatedCombat &&
            updatedCombat.enemy.modules.every((m) => m.health <= 0)
        ) {
            // Victory!
            const loot = updatedCombat.loot;

            // Boss special: check for resurrect chance
            if (
                updatedCombat.enemy.isBoss &&
                updatedCombat.enemy.specialAbility?.effect ===
                    "resurrect_chance"
            ) {
                const resurrectChance =
                    (updatedCombat.enemy.specialAbility.value || 20) / 100;
                if (Math.random() < resurrectChance) {
                    // Resurrect boss with 30% health
                    get().addLog(
                        `⚠️ ${updatedCombat.enemy.name} ВОСКРЕСАЕТ!`,
                        "error",
                    );
                    set((s) => {
                        if (!s.currentCombat) return s;
                        return {
                            currentCombat: {
                                ...s.currentCombat,
                                enemy: {
                                    ...s.currentCombat.enemy,
                                    modules: s.currentCombat.enemy.modules.map(
                                        (m) => ({
                                            ...m,
                                            health: Math.floor(
                                                (m.maxHealth || 100) * 0.3,
                                            ),
                                        }),
                                    ),
                                    shields: Math.floor(
                                        s.currentCombat.enemy.maxShields * 0.3,
                                    ),
                                },
                            },
                        };
                    });
                    // Continue combat instead of ending
                    get().addLog(`Босс восстановил 30% здоровья!`, "warning");
                    return;
                }
            }

            // Collect battle results
            const damagedModules = get()
                .ship.modules.filter((m) => m.health < 100)
                .map((m) => ({ name: m.name, damage: 100 - m.health }));
            const destroyedModules = get()
                .ship.modules.filter((m) => m.health <= 0)
                .map((m) => m.name);
            const woundedCrew = get()
                .crew.filter((c) => c.health < 100)
                .map((c) => ({ name: c.name, damage: 100 - c.health }));

            // Add credits
            let creditsAmount = loot.credits;

            // Apply black_box cursed artifact bonus (+75% credits)
            const blackBox = state.artifacts.find(
                (a) => a.effect.type === "credit_booster" && a.effect.active,
            );
            if (blackBox) {
                const boostValue =
                    getArtifactEffectValue(blackBox, state) / 100;
                creditsAmount = Math.floor(creditsAmount * (1 + boostValue));
            }

            // Apply lootBonus trait (Удачливый: +5% credits)
            let lootBonus = 0;
            get().crew.forEach((c) => {
                c.traits?.forEach((trait) => {
                    if (trait.effect.lootBonus) {
                        lootBonus += trait.effect.lootBonus;
                    }
                });
            });
            if (lootBonus > 0) {
                creditsAmount = Math.floor(creditsAmount * (1 + lootBonus));
            }

            set((s) => ({ credits: s.credits + creditsAmount }));

            if (blackBox && creditsAmount > loot.credits) {
                get().addLog(
                    `📦 Чёрный Ящик: +${creditsAmount - loot.credits}₢ бонус`,
                    "info",
                );
            }
            if (lootBonus > 0) {
                const luckyCrew = get().crew.filter((c) =>
                    c.traits?.some((t) => t.effect.lootBonus),
                );
                get().addLog(
                    `★ Удачливый экипаж: +${Math.round(lootBonus * 100)}% к награде (${luckyCrew.map((c) => c.name).join(", ")})`,
                    "info",
                );
            }

            // Check for artifact
            let artifactName: string | undefined;
            if (updatedCombat.enemy.isBoss && loot.guaranteedArtifact) {
                const artifactId = loot.guaranteedArtifact;
                const artifact = get().artifacts.find(
                    (a) => a.id === artifactId,
                );
                if (artifact && !artifact.discovered) {
                    artifactName = artifact.name;
                    set((s) => ({
                        artifacts: s.artifacts.map((a) =>
                            a.id === artifactId
                                ? { ...a, discovered: true }
                                : a,
                        ),
                    }));

                    // Complete mining contract when artifact is actually obtained
                    const miningContract = get().activeContracts.find(
                        (c) =>
                            c.type === "mining" &&
                            c.isRaceQuest &&
                            c.bossDefeated,
                    );
                    if (miningContract) {
                        set((s) => ({
                            credits: s.credits + (miningContract.reward || 0),
                        }));
                        get().addLog(
                            `Кристалл Древних найден! +${miningContract.reward}₢`,
                            "info",
                        );

                        // Give experience to all crew members
                        const expReward = CONTRACT_REWARDS.mining.baseExp;
                        giveCrewExperience(
                            expReward,
                            `Экипаж получил опыт: +${expReward} ед.`,
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
                }
            }

            // Check for module drop from boss
            if (updatedCombat.enemy.isBoss && loot.guaranteedModuleDrop) {
                const alreadyHasTier4Engine = state.ship.modules.some(
                    (m) =>
                        m.type === "engine" &&
                        !m.disabled &&
                        m.health > 0 &&
                        (m.level || 1) >= 4,
                );

                if (!alreadyHasTier4Engine) {
                    // Add tier 4 engine module to cargo hold (takes 0 space)
                    const moduleName = "★ Двигатель Ур.4";

                    const newCargoItem: CargoItem = {
                        item: moduleName,
                        quantity: 1,
                        moduleType: "engine",
                        moduleLevel: 4,
                        isModule: true,
                    };

                    set((s) => ({
                        ship: {
                            ...s.ship,
                            cargo: [...s.ship.cargo, newCargoItem],
                        },
                    }));

                    get().addLog(
                        `🎁 Награда за босса: Получен модуль "${moduleName}"!`,
                        "info",
                    );
                    get().addLog(
                        `📦 Модуль помещён в трюм. Посетите станцию для установки.`,
                        "info",
                    );
                } else {
                    // Give credits instead if already has the module
                    const bonusCredits = 5000;
                    set((s) => ({ credits: s.credits + bonusCredits }));
                    get().addLog(
                        `🎁 Награда за босса: +${bonusCredits}₢ (двигатель Ур.4 уже есть)`,
                        "info",
                    );
                }
            }

            // Mark boss as defeated in location
            if (updatedCombat.enemy.isBoss && get().currentLocation) {
                set((s) => ({
                    currentSector: s.currentSector
                        ? {
                              ...s.currentSector,
                              locations: s.currentSector.locations.map((loc) =>
                                  loc.id === get().currentLocation?.id
                                      ? { ...loc, bossDefeated: true }
                                      : loc,
                              ),
                          }
                        : null,
                }));
            }

            // ═══════════════════════════════════════════════════════════════
            // COMPLETE CONTRACTS
            // ═══════════════════════════════════════════════════════════════
            const enemyThreat = updatedCombat?.enemy.threat || 1;

            // Complete combat contracts (defeat any enemy in target sector)
            const completedCombat = get().activeContracts.filter(
                (c) =>
                    c.type === "combat" &&
                    c.sectorId === get().currentSector?.id,
            );
            completedCombat.forEach((c) => {
                set((s) => ({ credits: s.credits + c.reward }));
                get().addLog(
                    `Задача "${c.desc}" выполнена! +${c.reward}₢`,
                    "info",
                );

                // Give experience to all crew members
                const rewardConfig = CONTRACT_REWARDS.combat;
                const expReward =
                    rewardConfig.baseExp +
                    enemyThreat * (rewardConfig.threatBonus || 0);
                giveCrewExperience(
                    expReward,
                    `Экипаж получил опыт: +${expReward} ед.`,
                );

                set((s) => ({
                    completedContractIds: [...s.completedContractIds, c.id],
                    activeContracts: s.activeContracts.filter(
                        (ac) => ac.id !== c.id,
                    ),
                }));
            });

            // Complete bounty contracts (defeat enemy with required threat in target sector)
            const completedBounty = get().activeContracts.filter(
                (c) =>
                    c.type === "bounty" &&
                    c.targetSector === get().currentSector?.id &&
                    enemyThreat >= (c.targetThreat || 1),
            );
            completedBounty.forEach((c) => {
                set((s) => ({ credits: s.credits + c.reward }));
                get().addLog(`Охота выполнена! +${c.reward}₢`, "info");

                // Give experience to all crew members
                const rewardConfig = CONTRACT_REWARDS.bounty;
                const expReward =
                    rewardConfig.baseExp +
                    enemyThreat * (rewardConfig.threatBonus || 0);
                giveCrewExperience(
                    expReward,
                    `Экипаж получил опыт: +${expReward} ед.`,
                );

                set((s) => ({
                    completedContractIds: [...s.completedContractIds, c.id],
                    activeContracts: s.activeContracts.filter(
                        (ac) => ac.id !== c.id,
                    ),
                }));
            });

            // Complete mining contracts (crystalline quest - find artifact)
            // Mark boss as defeated, but don't complete yet - wait for artifact
            const miningContract = get().activeContracts.find(
                (c) => c.type === "mining" && c.isRaceQuest,
            );
            if (miningContract && updatedCombat?.enemy.isBoss) {
                // Mark boss as defeated in contract
                set((s) => ({
                    activeContracts: s.activeContracts.map((ac) =>
                        ac.id === miningContract.id
                            ? { ...ac, bossDefeated: true }
                            : ac,
                    ),
                }));
                get().addLog(
                    `Босс побеждён! Кристалл будет получен после исследования`,
                    "info",
                );
            }

            // Create battle result
            const battleResult: BattleResult = {
                victory: true,
                enemyName: updatedCombat.enemy.name,
                creditsEarned: loot.credits,
                modulesDamaged: damagedModules,
                modulesDestroyed: destroyedModules,
                crewWounded: woundedCrew,
                crewKilled: [], // Killed crew are already removed from crew array
                artifactFound: artifactName,
            };

            // Get research resources from combat
            const enemyTier = updatedCombat.enemy.threat || 1;
            let combatResources = getCombatLootResources(enemyTier);

            // Boss bonus - additional resources
            if (updatedCombat.enemy.isBoss) {
                const bossResources = getBossLootResources(enemyTier);
                combatResources = [...combatResources, ...bossResources];
            }

            if (combatResources.length > 0) {
                set((s) => ({
                    research: {
                        ...s.research,
                        resources: {
                            ...s.research.resources,
                            ...combatResources.reduce(
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
                combatResources.forEach((res) => {
                    if (res.quantity > 0) {
                        get().addLog(
                            `🔧 Получены исследовательские ресурсы: ${RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].icon} ${RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].name} x${res.quantity}`,
                            "info",
                        );
                    }
                });
            }

            // Give experience to crew who participated in combat
            const gunner = state.crew.find(
                (c) =>
                    c.profession === "gunner" ||
                    (c.profession === "pilot" &&
                        getActiveAssignment(c, true) === "targeting"),
            );
            if (gunner) {
                get().gainExp(gunner, 10 + enemyThreat * 5);
                get().addLog(`${gunner.name} получил боевой опыт!`, "info");
            }

            // Give small experience to any crew in weapon bays
            const weaponBayCrew = state.crew.filter(
                (c) =>
                    weaponBays.some((wb) => wb.id === c.moduleId) &&
                    c.id !== gunner?.id,
            );
            weaponBayCrew.forEach((c) => {
                get().gainExp(c, 5);
            });

            const { currentLocation } = get();
            // Mark location as completed
            if (currentLocation) {
                set((s) => ({
                    completedLocations: [
                        ...s.completedLocations,
                        currentLocation.id,
                    ],
                }));
            }

            // Reset combat assignments after battle
            set((s) => ({
                crew: s.crew.map((c) => ({
                    ...c,
                    combatAssignment: null,
                    combatAssignmentEffect: null,
                })),
            }));

            // Set battle results and change mode
            set((s) => ({
                battleResult,
                currentCombat: null,
                ship: { ...s.ship, shields: s.ship.maxShields },
                gameMode: "battle_results",
            }));

            // ═══════════════════════════════════════════════════════════════
            // CURSED ARTIFACT - Critical Overload: Self damage after combat
            // ═══════════════════════════════════════════════════════════════
            const criticalOverload = state.artifacts.find(
                (a) =>
                    a.cursed &&
                    a.effect.type === "critical_overload" &&
                    a.effect.active,
            );
            if (criticalOverload && state.ship.modules.length > 0) {
                const negativeValue = getArtifactEffectValue(
                    criticalOverload,
                    state,
                );
                const randomModuleIdx = Math.floor(
                    Math.random() * state.ship.modules.length,
                );
                const targetModule = state.ship.modules[randomModuleIdx];
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m, i) =>
                            i === randomModuleIdx
                                ? {
                                      ...m,
                                      health: Math.max(
                                          1,
                                          m.health - negativeValue,
                                      ),
                                  }
                                : m,
                        ),
                    },
                }));
                get().addLog(
                    `⚠️ ${criticalOverload.name}: ${targetModule.name} повреждён на -${negativeValue}% после боя`,
                    "warning",
                );
            }

            get().updateShipStats();
            return;
        }

        // Enemy attack
        const eDmg =
            updatedCombat?.enemy.modules.reduce(
                (s, m) => s + (m.health > 0 ? m.damage || 0 : 0),
                0,
            ) || 0;

        // Skip attack if enemy has no damage (all weapon modules destroyed)
        if (eDmg <= 0) {
            get().addLog(
                `⚠️ Враг не может атаковать - все орудия уничтожены!`,
                "info",
            );
            get().updateShipStats();
            return;
        }

        // ═══════════════════════════════════════════════════════════════
        // PILOT EVASION - Chance to evade enemy attack
        // ═══════════════════════════════════════════════════════════════
        const pilot = state.crew.find((c) => c.profession === "pilot");
        const pilotInCockpit =
            pilot &&
            state.ship.modules.find((m) => m.id === pilot.moduleId)?.type ===
                "cockpit";
        let pilotEvasionChance = 0;

        if (pilotInCockpit && pilot) {
            // Base evasion chance from pilot level: 5% per level
            pilotEvasionChance = (pilot.level || 1) * 0.05;

            // Add ship evasion bonus
            pilotEvasionChance += (state.ship.bonusEvasion || 0) / 100;
        }

        if (
            pilot &&
            pilotEvasionChance > 0 &&
            Math.random() < pilotEvasionChance
        ) {
            get().addLog(`✈️ Пилот ${pilot.name} уклонился от атаки!`, "info");
            get().gainExp(pilot, 8); // Experience for successful evasion
            // Skip the rest of enemy attack
            return;
        }

        // ═══════════════════════════════════════════════════════════════
        // KRYLORIAN INTIMIDATION - Chance to evade enemy attack
        // ═══════════════════════════════════════════════════════════════
        const krylorianCrew = state.crew.filter((c) => c.race === "krylorian");
        let evasionChance = 0;
        krylorianCrew.forEach((c) => {
            const race = RACES[c.race];
            if (race?.specialTraits) {
                const intimidationTrait = race.specialTraits.find(
                    (t) => t.id === "intimidation",
                );
                if (
                    intimidationTrait &&
                    intimidationTrait.effects.evasionBonus
                ) {
                    evasionChance += Number(
                        intimidationTrait.effects.evasionBonus,
                    );
                }
            }
        });

        if (evasionChance > 0 && Math.random() < evasionChance) {
            get().addLog(
                `🦎 Крилорианское устрашение! Враг промахнулся!`,
                "info",
            );
            // Skip the rest of enemy attack
        } else {
            // ═══════════════════════════════════════════════════════════════
            // ENEMY AI - Module targeting
            // Priority: Weapon Bay > Cockpit > Reactor > Engine > Shield > Others
            // Also considers: damaged modules (easier to destroy), crew presence
            // ═══════════════════════════════════════════════════════════════
            const activeMods = get().ship.modules.filter((m) => m.health > 0);

            const getModuleTargetPriority = (m: Module): number => {
                let priority = 0;
                const crewInModule = get().crew.filter(
                    (c) => c.moduleId === m.id,
                );

                // Base priority by module type
                switch (m.type) {
                    case "weaponbay":
                        priority = 100;
                        break; // High priority - disable weapons
                    case "cockpit":
                        priority = 90;
                        break; // High - disable navigation
                    case "reactor":
                        priority = 85;
                        break; // High - disable power
                    case "engine":
                        priority = 70;
                        break; // Medium - disable travel
                    case "shield":
                        priority = 60;
                        break; // Medium - disable defense
                    case "lifesupport":
                        priority = 50;
                        break; // Lower - crew suffocation
                    case "fueltank":
                        priority = 45;
                        break; // Lower - fuel
                    case "medical":
                        priority = 40;
                        break; // Lower - healing
                    case "cargo":
                        priority = 20;
                        break; // Low
                    case "scanner":
                        priority = 15;
                        break; // Low
                    case "drill":
                        priority = 5;
                        break; // Lowest
                    default:
                        priority = 30;
                }

                // Bonus for damaged modules (easier to destroy)
                if (m.health < 30) priority += 30;
                else if (m.health < 50) priority += 15;
                else if (m.health < 70) priority += 5;

                // Bonus for modules with crew (kill crew)
                priority += crewInModule.length * 10;

                // Add some randomness
                priority += Math.random() * 20;

                return priority;
            };

            // Select target module
            let tgt: Module | null = null;
            if (activeMods.length > 0) {
                // Sort by priority and pick the highest
                const sortedMods = [...activeMods].sort(
                    (a, b) =>
                        getModuleTargetPriority(b) - getModuleTargetPriority(a),
                );
                tgt = sortedMods[0];
            }

            // Helper: Damage crew in module
            const damageCrewInModule = (
                moduleId: number,
                damage: number,
                isDestruction: boolean,
            ) => {
                const crewInModule = get().crew.filter(
                    (c) => c.moduleId === moduleId,
                );
                if (crewInModule.length === 0) return;

                const actualDamage = isDestruction
                    ? Math.floor(damage * 1.5)
                    : damage;

                // Check for life_crystal artifact (crew can't die, health stays at 1)
                const lifeCrystal = state.artifacts.find(
                    (a) => a.effect.type === "crew_immortal" && a.effect.active,
                );

                set((s) => ({
                    crew: s.crew.map((c) => {
                        if (c.moduleId !== moduleId) return c;
                        let newHealth = c.health - actualDamage;
                        // Apply life_crystal immortality
                        if (lifeCrystal && newHealth < 1) {
                            newHealth = 1;
                        }
                        return {
                            ...c,
                            health: Math.max(0, newHealth),
                        };
                    }),
                }));

                if (isDestruction) {
                    get().addLog(
                        `💥 Модуль уничтожен! Экипаж получает критический урон: -${actualDamage}`,
                        "error",
                    );
                    if (lifeCrystal) {
                        get().addLog(`✨ Кристалл Жизни спас экипаж!`, "info");
                    }
                } else {
                    get().addLog(
                        `👤 Экипаж в модуле получил урон: -${actualDamage}`,
                        "warning",
                    );
                }

                // Log affected crew
                crewInModule.forEach((c) => {
                    const newHealth =
                        get().crew.find((cr) => cr.id === c.id)?.health || 0;
                    if (newHealth <= 0) {
                        get().addLog(`☠️ ${c.name} погиб!`, "error");
                    } else if (lifeCrystal && newHealth === 1) {
                        get().addLog(
                            `✨ ${c.name} выжил благодаря Кристаллу Жизни!`,
                            "info",
                        );
                    }
                });
            };

            // ═══════════════════════════════════════════════════════════════
            // DEBUG - Log all active artifacts
            // ═══════════════════════════════════════════════════════════════
            const activeArtifacts = state.artifacts.filter(
                (a) => a.effect.active,
            );
            if (activeArtifacts.length > 0) {
                get().addLog(
                    `📦 Активные артефакты: ${activeArtifacts.map((a) => a.name).join(", ")}`,
                    "info",
                );
            }

            // ═══════════════════════════════════════════════════════════════
            // MIRROR SHIELD - Chance to reflect attack to random enemy module
            // When triggered, attack hits enemy module instead of player's ship
            // Works regardless of shields - checked FIRST
            // ═══════════════════════════════════════════════════════════════
            const mirrorShield = state.artifacts.find(
                (a) => a.effect.type === "damage_reflect" && a.effect.active,
            );
            let attackReflected = false;
            let reflectedTarget = null;
            let reflectedDamage = 0;

            if (mirrorShield) {
                const reflectChance =
                    getArtifactEffectValue(mirrorShield, state) / 100;
                get().addLog(
                    `🛡️ Зеркальный Щит активен! Шанс отражения: ${Math.round(reflectChance * 100)}%`,
                    "info",
                );
            }

            // Check reflection FIRST (before shields, works without shields)
            if (
                mirrorShield &&
                updatedCombat &&
                Math.random() <
                    getArtifactEffectValue(mirrorShield, state) / 100
            ) {
                const aliveModules = updatedCombat.enemy.modules.filter(
                    (m) => m.health > 0,
                );
                if (aliveModules.length > 0) {
                    reflectedTarget =
                        aliveModules[
                            Math.floor(Math.random() * aliveModules.length)
                        ];
                    reflectedDamage = eDmg;
                    attackReflected = true;
                    get().addLog(`🎲 Шанс сработал! Отражаем атаку!`, "info");
                }
            }

            // If reflected, deal damage to enemy and skip all player damage
            if (attackReflected && reflectedTarget) {
                set((s) => {
                    if (!s.currentCombat) return s;
                    return {
                        currentCombat: {
                            ...s.currentCombat,
                            enemy: {
                                ...s.currentCombat.enemy,
                                modules: s.currentCombat.enemy.modules.map(
                                    (m) =>
                                        m.id === reflectedTarget.id
                                            ? {
                                                  ...m,
                                                  health: Math.max(
                                                      0,
                                                      m.health -
                                                          reflectedDamage,
                                                  ),
                                              }
                                            : m,
                                ),
                            },
                        },
                    };
                });
                get().addLog(
                    `🛡️ ЗЕРКАЛЬНЫЙ ЩИТ! Атака отражена в "${reflectedTarget.name}"! -${reflectedDamage}%`,
                    "info",
                );
                return; // Skip all damage to player
            }

            // Attack NOT reflected - proceed with normal damage
            if (get().ship.shields > 0) {
                const sDmg = Math.min(get().ship.shields, eDmg);
                set((s) => ({
                    ship: { ...s.ship, shields: s.ship.shields - sDmg },
                }));
                get().addLog(`Враг по щитам: -${sDmg}`, "warning");
                const overflow = eDmg - sDmg;

                if (overflow > 0 && tgt) {
                    // ═══════════════════════════════════════════════════════════════
                    // MODULE DEFENSE (ARMOR) - Flat damage reduction
                    // Each point of defense reduces damage by 1
                    // ═══════════════════════════════════════════════════════════════
                    const shipDefense = state.ship.armor || 0;
                    const damageAfterArmor = Math.max(
                        1,
                        overflow - shipDefense,
                    );

                    // Log armor reduction if applicable
                    if (shipDefense > 0 && damageAfterArmor < overflow) {
                        get().addLog(
                            `🛡️ Броня: -${overflow - damageAfterArmor} урона`,
                            "info",
                        );
                    }

                    // ═══════════════════════════════════════════════════════════════
                    // CRYSTALLINE ARMOR ARTIFACT - +3 defense to ALL modules
                    // ═══════════════════════════════════════════════════════════════
                    const crystalArmorArtifact = state.artifacts.find(
                        (a) =>
                            a.effect.type === "module_armor" && a.effect.active,
                    );
                    let artifactDefense = 0;
                    if (crystalArmorArtifact) {
                        artifactDefense = getArtifactEffectValue(
                            crystalArmorArtifact,
                            state,
                        );
                        get().addLog(
                            `💎 Кристаллическая Броня (артефакт): +${artifactDefense} к защите модуля`,
                            "info",
                        );
                    }

                    // Apply artifact defense bonus (flat reduction)
                    const damageAfterArtifact = Math.max(
                        1,
                        damageAfterArmor - artifactDefense,
                    );

                    // ═══════════════════════════════════════════════════════════════
                    // CRYSTALLINE RACE - Additional percentage damage reduction
                    // ═══════════════════════════════════════════════════════════════
                    let moduleDefense = 0;
                    const crystallineCrew = state.crew.filter(
                        (c) => c.race === "crystalline",
                    );
                    crystallineCrew.forEach((c) => {
                        const race = RACES[c.race];
                        if (race?.specialTraits) {
                            const armorTrait = race.specialTraits.find(
                                (t) => t.id === "crystal_armor",
                            );
                            if (
                                armorTrait &&
                                armorTrait.effects.moduleDefense
                            ) {
                                moduleDefense += armorTrait.effects
                                    .moduleDefense as number;
                            }
                        }
                    });

                    const reducedDamage = Math.floor(
                        damageAfterArtifact * (1 - moduleDefense),
                    );
                    const wasDestroyed = tgt.health <= reducedDamage;
                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m) =>
                                m.id === tgt.id
                                    ? {
                                          ...m,
                                          health: Math.max(
                                              0,
                                              m.health - reducedDamage,
                                          ),
                                      }
                                    : m,
                            ),
                        },
                    }));

                    if (artifactDefense > 0) {
                        get().addLog(
                            `💎 Кристаллическая Броня: -${artifactDefense} урона (артефакт)`,
                            "info",
                        );
                    }
                    if (
                        moduleDefense > 0 &&
                        reducedDamage < damageAfterArtifact
                    ) {
                        get().addLog(
                            `💎 Кристаллическая раса: -${damageAfterArtifact - reducedDamage} урона (%)`,
                            "info",
                        );
                    }
                    get().addLog(
                        `Пробитие! Враг по "${tgt.name}": -${reducedDamage}%`,
                        "warning",
                    );

                    // Damage crew in module
                    let crewDamage = Math.floor(reducedDamage * 0.5);
                    // Extra damage to crew in broken modules (health < 30)
                    if (tgt.health < 30) {
                        crewDamage = Math.floor(crewDamage * 1.5);
                        get().addLog(
                            `⚠️ Модуль повреждён! Экипаж получает повышенный урон!`,
                            "error",
                        );
                    }
                    damageCrewInModule(tgt.id, crewDamage, wasDestroyed);
                }
            } else if (tgt) {
                // Attack was NOT reflected (checked above) - proceed with normal damage
                // ═══════════════════════════════════════════════════════════════
                // CRYSTALLINE ARMOR ARTIFACT - +3 defense to ALL modules
                // ═══════════════════════════════════════════════════════════════
                const crystalArmorArtifact = state.artifacts.find(
                    (a) => a.effect.type === "module_armor" && a.effect.active,
                );
                let artifactDefense = 0;
                if (crystalArmorArtifact) {
                    artifactDefense = getArtifactEffectValue(
                        crystalArmorArtifact,
                        state,
                    );
                    get().addLog(
                        `💎 Кристаллическая Броня (артефакт): +${artifactDefense} к защите модуля`,
                        "info",
                    );
                }

                // Apply artifact defense bonus (flat reduction)
                const damageAfterArtifact = Math.max(1, eDmg - artifactDefense);

                // ═══════════════════════════════════════════════════════════════
                // CRYSTALLINE RACE - Additional percentage damage reduction
                // ═══════════════════════════════════════════════════════════════
                let moduleDefense = 0;
                const crystallineCrew = state.crew.filter(
                    (c) => c.race === "crystalline",
                );
                crystallineCrew.forEach((c) => {
                    const race = RACES[c.race];
                    if (race?.specialTraits) {
                        const armorTrait = race.specialTraits.find(
                            (t) => t.id === "crystal_armor",
                        );
                        if (armorTrait && armorTrait.effects.moduleDefense) {
                            moduleDefense += armorTrait.effects
                                .moduleDefense as number;
                        }
                    }
                });

                const reducedDamage = Math.floor(
                    damageAfterArtifact * (1 - moduleDefense),
                );
                const wasDestroyed = tgt.health <= reducedDamage;
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === tgt.id
                                ? {
                                      ...m,
                                      health: Math.max(
                                          0,
                                          m.health - reducedDamage,
                                      ),
                                  }
                                : m,
                        ),
                    },
                }));

                if (artifactDefense > 0) {
                    get().addLog(
                        `💎 Кристаллическая Броня: -${artifactDefense} урона (артефакт)`,
                        "info",
                    );
                }
                if (moduleDefense > 0 && reducedDamage < damageAfterArtifact) {
                    get().addLog(
                        `💎 Кристаллическая раса: -${damageAfterArtifact - reducedDamage} урона (%)`,
                        "info",
                    );
                }
                get().addLog(
                    `Враг по "${tgt.name}": -${reducedDamage}%`,
                    "warning",
                );

                // Damage crew in module
                let crewDamage = Math.floor(reducedDamage * 0.5);
                // Extra damage to crew in broken modules (health < 30)
                if (tgt.health < 30) {
                    crewDamage = Math.floor(crewDamage * 1.5);
                    get().addLog(
                        `⚠️ Модуль повреждён! Экипаж получает повышенный урон!`,
                        "error",
                    );
                }
                damageCrewInModule(tgt.id, crewDamage, wasDestroyed);

                // Apply combatMoraleDrain trait (Трус: -10 морали в бою при получении урона)
                const crewInDamagedModule = get().crew.filter(
                    (c) => c.moduleId === tgt.id,
                );
                crewInDamagedModule.forEach((c) => {
                    c.traits?.forEach((trait) => {
                        if (trait.effect.combatMoraleDrain) {
                            const moraleDrain = trait.effect.combatMoraleDrain;
                            set((s) => ({
                                crew: s.crew.map((cr) =>
                                    cr.id === c.id
                                        ? {
                                              ...cr,
                                              happiness: Math.max(
                                                  0,
                                                  cr.happiness - moraleDrain,
                                              ),
                                          }
                                        : cr,
                                ),
                            }));
                            get().addLog(
                                `⚠️ ${c.name} (${trait.name}): -${moraleDrain} морали от урона`,
                                "warning",
                            );
                        }
                    });
                });
            }

            // Remove dead crew from ship
            const deadCrew = get().crew.filter((c) => c.health <= 0);
            if (deadCrew.length > 0) {
                set((s) => ({ crew: s.crew.filter((c) => c.health > 0) }));
                get().addLog(
                    `☠️ Потери экипажа: ${deadCrew.map((c) => c.name).join(", ")}`,
                    "error",
                );
            }
        } // End of else block for evasion check

        // ═══════════════════════════════════════════════════════════════
        // BOSS REGENERATION AND SPECIAL ABILITIES
        // ═══════════════════════════════════════════════════════════════
        const currentCombat = get().currentCombat;
        if (currentCombat?.enemy.isBoss) {
            const boss = currentCombat.enemy;

            // Boss regeneration
            if (boss.regenRate && boss.regenRate > 0) {
                const aliveModules = boss.modules.filter((m) => m.health > 0);
                if (aliveModules.length > 0) {
                    const regenAmount = boss.regenRate;
                    set((s) => {
                        if (!s.currentCombat) return s;
                        return {
                            currentCombat: {
                                ...s.currentCombat,
                                enemy: {
                                    ...s.currentCombat.enemy,
                                    modules: s.currentCombat.enemy.modules.map(
                                        (m) => ({
                                            ...m,
                                            health:
                                                m.health > 0 &&
                                                m.health < (m.maxHealth || 100)
                                                    ? Math.min(
                                                          m.maxHealth || 100,
                                                          m.health +
                                                              regenAmount,
                                                      )
                                                    : m.health,
                                        }),
                                    ),
                                },
                            },
                        };
                    });
                    get().addLog(
                        `⚙️ Регенерация босса: +${regenAmount}%`,
                        "warning",
                    );
                }
            }

            // Boss special abilities (every_turn trigger)
            if (boss.specialAbility?.trigger === "every_turn") {
                const ability = boss.specialAbility;

                switch (ability.effect) {
                    case "heal_all":
                        const healAmount = ability.value || 10;
                        set((s) => {
                            if (!s.currentCombat) return s;
                            return {
                                currentCombat: {
                                    ...s.currentCombat,
                                    enemy: {
                                        ...s.currentCombat.enemy,
                                        modules:
                                            s.currentCombat.enemy.modules.map(
                                                (m) => ({
                                                    ...m,
                                                    health:
                                                        m.health > 0
                                                            ? Math.min(
                                                                  m.maxHealth ||
                                                                      100,
                                                                  m.health +
                                                                      healAmount,
                                                              )
                                                            : m.health,
                                                }),
                                            ),
                                    },
                                },
                            };
                        });
                        get().addLog(
                            `★ ${ability.name}: +${healAmount}% ко всем модулям`,
                            "warning",
                        );
                        break;

                    case "evasion_boost":
                        if (Math.random() < (ability.value || 25) / 100) {
                            get().addLog(
                                `★ ${ability.name}: Босс уклонился!`,
                                "warning",
                            );
                            // Apply some damage to player instead (reflection)
                            const reflectDmg = Math.floor(eDmg * 0.3);
                            if (reflectDmg > 0) {
                                const activeMods = get().ship.modules.filter(
                                    (m) => m.health > 0,
                                );
                                if (activeMods.length > 0) {
                                    const tgt =
                                        activeMods[
                                            Math.floor(
                                                Math.random() *
                                                    activeMods.length,
                                            )
                                        ];
                                    set((s) => ({
                                        ship: {
                                            ...s.ship,
                                            modules: s.ship.modules.map((m) =>
                                                m.id === tgt.id
                                                    ? {
                                                          ...m,
                                                          health: Math.max(
                                                              0,
                                                              m.health -
                                                                  reflectDmg,
                                                          ),
                                                      }
                                                    : m,
                                            ),
                                        },
                                    }));
                                }
                            }
                        }
                        break;
                }
            }

            // Boss low_health special ability trigger
            if (boss.specialAbility?.trigger === "low_health") {
                const totalHealth = boss.modules.reduce(
                    (sum, m) => sum + m.health,
                    0,
                );
                const maxHealth = boss.modules.reduce(
                    (sum, m) => sum + (m.maxHealth || 100),
                    0,
                );
                const healthPercent = (totalHealth / maxHealth) * 100;

                if (healthPercent < 30) {
                    const ability = boss.specialAbility;

                    switch (ability.effect) {
                        case "emergency_repair":
                            const repairAmount = ability.value || 25;
                            set((s) => {
                                if (!s.currentCombat) return s;
                                return {
                                    currentCombat: {
                                        ...s.currentCombat,
                                        enemy: {
                                            ...s.currentCombat.enemy,
                                            modules:
                                                s.currentCombat.enemy.modules.map(
                                                    (m) => ({
                                                        ...m,
                                                        health:
                                                            m.health > 0
                                                                ? Math.min(
                                                                      m.maxHealth ||
                                                                          100,
                                                                      m.health +
                                                                          repairAmount,
                                                                  )
                                                                : m.health,
                                                    }),
                                                ),
                                        },
                                    },
                                };
                            });
                            get().addLog(
                                `★ ${ability.name}: Аварийное восстановление! +${repairAmount}%`,
                                "error",
                            );
                            break;
                    }
                }
            }
        }

        // Check defeat - game over if hull destroyed
        get().checkGameOver();

        // Clear selection
        set((s) => {
            if (!s.currentCombat) return s;
            return {
                currentCombat: {
                    ...s.currentCombat,
                    enemy: { ...s.currentCombat.enemy, selectedModule: null },
                },
            };
        });
        get().updateShipStats();

        // ═══════════════════════════════════════════════════════════════
        // ALIEN PRESENCE - Xenosymbionts and Voidborn reduce organic morale
        // Applied at end of combat turn (same as normal turn)
        // ═══════════════════════════════════════════════════════════════
        get().crew.forEach((c) => {
            const crewRace = RACES[c.race];
            const crewInSameModule = get().crew.filter(
                (cr) => cr.moduleId === c.moduleId,
            );

            if (crewRace?.specialTraits) {
                const penaltyTrait = crewRace.specialTraits.find(
                    (t) => t.effects.alienPresencePenalty,
                );
                if (penaltyTrait && penaltyTrait.effects.alienPresencePenalty) {
                    const penalty = Math.abs(
                        Number(penaltyTrait.effects.alienPresencePenalty),
                    );
                    // Affects organics in same module (not synthetic, not same race)
                    const affectedCrew = crewInSameModule.filter(
                        (cr) =>
                            cr.race !== "synthetic" &&
                            cr.race !== c.race &&
                            cr.id !== c.id,
                    );
                    if (affectedCrew.length > 0) {
                        set((s) => ({
                            crew: s.crew.map((cr) =>
                                cr.moduleId === c.moduleId &&
                                cr.race !== "synthetic" &&
                                cr.race !== c.race &&
                                cr.id !== c.id
                                    ? {
                                          ...cr,
                                          happiness: Math.max(
                                              0,
                                              cr.happiness - penalty,
                                          ),
                                      }
                                    : cr,
                            ),
                        }));
                        affectedCrew.forEach((cr) => {
                            get().addLog(
                                `😰 ${cr.name}: Беспокойство от ${crewRace.name} (-${penalty} 😞)`,
                                "warning",
                            );
                        });
                    }
                }
            }
        });
    },

    retreat: () => {
        get().addLog("ОТСТУПЛЕНИЕ!", "warning");

        // Reset combat assignments
        set((s) => ({
            crew: s.crew.map((c) => ({
                ...c,
                combatAssignment: null,
                combatAssignmentEffect: null,
            })),
        }));

        set((s) => ({
            crew: s.crew.map((c) => ({
                ...c,
                happiness: Math.max(0, c.happiness - 20),
            })),
            currentCombat: null,
        }));
        // Damage random module
        const randMod =
            get().ship.modules[
                Math.floor(Math.random() * get().ship.modules.length)
            ];
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) =>
                    m.id === randMod.id
                        ? { ...m, health: Math.max(10, m.health - 40) }
                        : m,
                ),
            },
        }));
        get().updateShipStats();
        set({ gameMode: "sector_map" });
    },

    buyItem: (item, targetModuleId) => {
        const state = get();
        if (state.credits < item.price) {
            get().addLog("Недостаточно кредитов!", "error");
            return;
        }

        const stationId = state.currentLocation?.stationId;
        if (!stationId) return;

        const inv = state.stationInventory[stationId] || {};
        const bought = inv[item.id] || 0;

        if (bought >= item.stock) {
            get().addLog("Товар распродан!", "error");
            return;
        }

        if (item.type === "upgrade" && item.targetType) {
            // Find the specific module to upgrade, or the first matching one if no targetModuleId
            let tgt: Module | undefined;
            if (targetModuleId !== undefined) {
                tgt = state.ship.modules.find(
                    (m) =>
                        m.id === targetModuleId && m.type === item.targetType,
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
                get().addLog("Максимальный уровень улучшения! (LV3)", "error");
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
                }));

                set((s) => ({
                    credits: s.credits - item.price,
                    stationInventory: {
                        ...s.stationInventory,
                        [stationId]: { ...inv, [item.id]: bought + 1 },
                    },
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
                                  // Keep position and health
                                  x: m.x,
                                  y: m.y,
                                  level: nextLevel,
                                  defense: nextLevel, // Defense equals module level
                                  maxHealth: (m.maxHealth || 100) + 20,
                                  health: (m.health || 100) + 20, // Heal on upgrade
                              }
                            : m,
                    ),
                },
            }));

            set((s) => ({
                credits: s.credits - item.price,
                stationInventory: {
                    ...s.stationInventory,
                    [stationId]: { ...inv, [item.id]: bought + 1 },
                },
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
            const hasDrill = state.ship.modules.some((m) => m.type === "drill");
            const isUniqueScanner =
                item.moduleType === "scanner" && item.id.includes("quantum");
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
                get().addLog("Можно иметь только один такой модуль!", "error");
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
                health: 100,
                maxHealth: 100,
                // Defense based on module level (1 defense per level, max 5 for rare tier 4)
                defense: 1,
                // Determine level from item ID - check for specific patterns
                level: (() => {
                    // Check for unique tier 4 modules first
                    if (
                        item.id.includes("-ancient") ||
                        item.id.includes("-quantum") ||
                        item.id.includes("-fusion")
                    )
                        return 4;
                    // Check for tier level in ID (e.g., "fueltank-3", "reactor-2")
                    // Match pattern: moduleType-N where N is 2, 3, or 4
                    const tierMatch = item.id.match(/-(\d)(?:-|$)/);
                    if (tierMatch) {
                        const tier = parseInt(tierMatch[1], 10);
                        if (tier >= 2 && tier <= 4) return tier;
                    }
                    return 1;
                })(),
                ...(item.moduleType === "reactor" && {
                    power: item.power || 10,
                }),
                ...(item.moduleType === "engine" && {
                    fuelEfficiency: 10,
                    consumption: item.consumption || 1,
                }),
                ...(item.moduleType === "drill" && {
                    consumption: item.consumption || 1,
                }),
                ...(item.moduleType === "cargo" && {
                    capacity: Math.floor((item.capacity || 50) * cargoBonus),
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
                ...(item.moduleType === "weaponbay" && {
                    weapons: Array((item.width || 1) * (item.height || 1)).fill(
                        null,
                    ),
                    consumption: item.consumption || 2,
                }),
                ...(item.moduleType === "cockpit" && { consumption: 1 }),
                // For any other module type, include properties from item if defined
                ...(item.power !== undefined && { power: item.power }),
                ...(item.consumption !== undefined && {
                    consumption: item.consumption,
                }),
                ...(item.defense !== undefined && { defense: item.defense }),
                ...(item.scanRange !== undefined && {
                    scanRange: item.scanRange,
                }),
                ...(item.oxygen !== undefined && { oxygen: item.oxygen }),
                ...(item.capacity !== undefined && { capacity: item.capacity }),
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
                    if (get().canPlaceModule(module, centerPos, centerPos)) {
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
                    ship: { ...s.ship, modules: [...s.ship.modules, newMod] },
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
                modules: s.ship.modules.map((m) => ({ ...m, health: 100 })),
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
                happiness: Math.min(c.maxHappiness || 100, c.happiness + 20),
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
        if (
            cargoModule.capacity &&
            currentCargo + quantity > cargoModule.capacity
        ) {
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

        const playerGood = state.ship.tradeGoods.find((g) => g.item === goodId);
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
                    specialHealthPenalty += Number(trait.effects.healthPenalty);
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
            get().addLog("Нельзя уволить последнего члена экипажа!", "error");
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
        if (mod1.y < mod2.y + mod2.height && mod1.y + mod1.height > mod2.y) {
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

        // Check if target module is disabled
        if (targetModule.disabled) {
            get().addLog("Нельзя переместиться в отключённый модуль!", "error");
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
            const cargoName = DELIVERY_GOODS[cargoKey]?.name || contract.cargo;
            const cargoMod = get().ship.modules.find((m) => m.type === "cargo");
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
        const contract = get().activeContracts.find((c) => c.id === contractId);
        if (!contract) return;
        set((s) => ({
            ship: {
                ...s.ship,
                cargo: s.ship.cargo.filter((c) => c.contractId !== contractId),
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
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);

        playSound("success");
    },

    cancelContract: (contractId) => {
        const contract = get().activeContracts.find((c) => c.id === contractId);
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
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) =>
                    m.id === moduleId ? { ...m, disabled: !m.disabled } : m,
                ),
            },
        }));
        const mod = get().ship.modules.find((m) => m.id === moduleId);
        get().addLog(
            `Модуль "${mod?.name}" ${mod?.disabled ? "включён" : "отключён"}`,
            "info",
        );
        get().updateShipStats();
    },

    scrapModule: (moduleId) => {
        const state = get();
        const mod = state.ship.modules.find((m) => m.id === moduleId);
        if (!mod) return;

        // Check if any crew member is in this module
        const crewInModule = state.crew.filter((c) => c.moduleId === moduleId);
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
            get().addLog("Невозможно разместить: нарушена связность", "error");
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
                              visitedAnomalies: (c.visitedAnomalies || 0) + 1,
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
                            ? { ...m, health: Math.max(10, m.health - damage) }
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
            const reward = 20 + Math.floor(Math.random() * 30);
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
                const hasCapacity = state.crew.length < get().getCrewCapacity();

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
                        lifesupportModule?.id || get().ship.modules[0]?.id || 1;

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
                const goodId = keys[Math.floor(Math.random() * keys.length)];
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
                              locations: s.currentSector.locations.map((l) =>
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
            set((s) => ({ credits: s.credits + (miningContract.reward || 0) }));
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
            previousGameMode: state.gameMode,
            gameMode: "artifacts",
        }));
    },

    showResearch: () => {
        set((state) => ({
            previousGameMode: state.gameMode,
            gameMode: "research",
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
            get().addLog("Недостаточно кредитов для сканирования!", "error");
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
            get().addLog(`Недостаточно кредитов для ${spec.name}!`, "error");
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
                            effects: [{ type: "fuel_efficiency", value: 0.1 }],
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
                    shields: Math.max(0, s.ship.shields - bonusShieldsToRemove),
                },
            };
        });
    },

    checkGameOver: () => {
        const state = get();
        if (state.gameOver) return; // Already game over

        // Check for AI artifacts/modules that allow ship to operate without crew
        const hasAIArtifact = state.artifacts.some(
            (a) => a.id === "ai_neural_link" && !a.cursed && a.effect.active,
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
        for (const [resourceType, required] of Object.entries(tech.resources)) {
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
            (m) => m.type === "lab" && m.health > 0 && !m.disabled,
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

        for (const [resourceType, required] of Object.entries(tech.resources)) {
            let remaining = required;

            // First deduct from research resources
            const currentResearchResource =
                newResources[resourceType as keyof typeof newResources] || 0;
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
            (m) => m.type === "lab" && m.health > 0 && !m.disabled,
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
            (m) => m.type === "lab" && m.health > 0 && !m.disabled,
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
                                    (m.maxHealth || 100) * (1 + bonus.value),
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
                                            (m.power || 0) * (1 + bonus.value),
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
}));

// Helper function to get adjacent technologies (for discovery)
function getAdjacentTechs(techId: string): string[] {
    const adjacent: string[] = [];
    const tech = RESEARCH_TREE[techId];
    if (!tech) return adjacent;

    // Technologies that have this tech as prerequisite
    Object.values(RESEARCH_TREE).forEach((t) => {
        if (t.prerequisites.includes(techId)) {
            adjacent.push(t.id);
        }
    });

    return adjacent;
}

// Import research constants at the top
import { RESEARCH_TREE } from "@/game/constants/research";
