import { store as i18nStore } from "@/lib/useTranslation";
import {
    ARTIFACT_TYPES,
    RESEARCH_RESOURCES,
    MUTATION_CHANCES,
} from "@/game/constants";
import {
    BASE_GUNNER_COMBAT_EXP,
    GUNNER_COMBAT_EXP_PER_TIER,
    WEAPON_BAY_CREW_EXP,
} from "@/game/constants/experience";
import {
    getCombatLootResources,
    getBossLootResources,
} from "@/game/research/utils";
import {
    getActiveAssignment,
    giveRandomMutation,
} from "@/game/crew";
import { showHintOnce } from "@/game/hints/showHint";
import type {
    GameState,
    GameStore,
    CargoItem,
    BattleResult,
} from "@/game/types";
import { findActiveArtifact, getArtifactEffectValue } from "@/game/artifacts";
import { completeBattleContracts } from "./completeBattleContracts";
import { applyCombatTimeCost } from "./combatTime";
import { patchLocation } from "@/game/utils/patchLocation";
import { grantTimedEffect } from "@/game/effects/timedEffects";
import {
    getSpaceMonsterHuntReward,
    SPACE_MONSTERS,
} from "@/game/constants/spaceMonsters";

/**
 * Handles victory after defeating boss
 */
export function handleVictory(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    updatedCombat: NonNullable<GameState["currentCombat"]>,
    weaponBays: { id: number }[],
) {
    const combatRound = updatedCombat.round;
    const loot = updatedCombat.loot;
    const spaceMonsterLocation =
        state.currentLocation?.type === "space_monster"
            ? state.currentLocation
            : null;
    const spaceMonster = spaceMonsterLocation?.spaceMonsterType
        ? SPACE_MONSTERS[spaceMonsterLocation.spaceMonsterType]
        : null;

    // Boss resurrect chance
    if (
        updatedCombat.enemy.isBoss &&
        updatedCombat.enemy.specialAbility?.effect === "resurrect_chance"
    ) {
        const resurrectChance =
            (updatedCombat.enemy.specialAbility.value ?? 20) / 100;
        if (Math.random() < resurrectChance) {
            get().addLog( i18nStore.t("game_logs.playerVictory_1", { updatedCombat_name: updatedCombat.enemy.name }), "error");
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.enemy.modules.forEach((m) => {
                    m.health = Math.floor((m.maxHealth || 100) * 0.3);
                });
                s.currentCombat.enemy.shields = Math.floor(
                    s.currentCombat.enemy.maxShields * 0.3,
                );
            });
            get().addLog( i18nStore.t("game_logs.playerVictory_2"), "warning");
            return;
        }
    }

    grantTimedEffect("combat_momentum", set, get);

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

    // Calculate credits
    let creditsAmount = loot.credits;

    const blackBox = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.BLACK_BOX,
    );

    if (blackBox) {
        const boostValue = getArtifactEffectValue(blackBox, state);
        creditsAmount = Math.floor(creditsAmount * (1 + boostValue));
    }

    let lootBonus = 0;
    get().crew.forEach((c) => {
        c.traits?.forEach((trait) => {
            if (trait.effect.lootBonus) lootBonus += trait.effect.lootBonus;
        });
    });
    if (lootBonus > 0) {
        creditsAmount = Math.floor(creditsAmount * (1 + lootBonus));
    }

    set((s) => ({ credits: s.credits + creditsAmount }));

    if (blackBox && creditsAmount > loot.credits) {
        get().addLog( i18nStore.t("game_logs.playerVictory_3", { credits: creditsAmount - loot.credits }),
            "info",
        );
    }
    if (lootBonus > 0) {
        get().addLog( i18nStore.t("game_logs.playerVictory_4", { value: Math.round(lootBonus * 100) }),
            "info",
        );
    }

    // Check for artifact
    let artifactName: string | undefined;
    if (updatedCombat.enemy.isBoss && loot.guaranteedArtifact) {
        const artifact = get().artifacts.find(
            (a) => a.id === loot.guaranteedArtifact,
        );
        if (artifact && !artifact.discovered) {
            artifactName = artifact.name;
            set((s) => {
                s.artifacts.forEach((a) => {
                    if (a.id === loot.guaranteedArtifact) {
                        a.discovered = true;
                        a.hinted = false;
                        a.hintedAt = undefined;
                    }
                });
            });
        }
    }

    // Check for module drop
    if (updatedCombat.enemy.isBoss && loot.module) {
        const moduleName = loot.module.name;

        const newCargoItem: CargoItem = {
            item: moduleName,
            quantity: 1,
            isModule: true,
            moduleLevel: loot.module.level ?? 4,
            module: loot.module, // Store full ShopItem data
        };
        set((s) => ({
            ship: { ...s.ship, cargo: [...s.ship.cargo, newCargoItem] },
        }));
        get().addLog( i18nStore.t("game_logs.playerVictory_6", { moduleName }),
            "info",
        );
        get().addLog( i18nStore.t("game_logs.playerVictory_7"),
            "info",
        );
    }

    // Mark boss as defeated
    if (updatedCombat.enemy.isBoss && get().currentLocation) {
        set((s) => {
            if (!s.currentSector) return;
            s.currentSector.locations.forEach((loc) => {
                if (loc.id === get().currentLocation?.id)
                    loc.bossDefeated = true;
            });
        });
    }

    // Mark regular enemy as defeated
    if (!updatedCombat.enemy.isBoss && get().currentLocation) {
        set((s) => {
            if (!s.currentLocation) return {};
            return patchLocation(s, s.currentLocation.id, { defeated: true });
        });
    }

    if (spaceMonsterLocation) {
        set((s) =>
            patchLocation(s, spaceMonsterLocation.id, {
                defeated: true,
                spaceMonsterResolved: "hunted" as const,
            }),
        );
    }

    // Complete contracts
    const enemyThreat = updatedCombat.enemy.threat ?? 1;
    completeBattleContracts(
        set,
        get,
        enemyThreat,
        updatedCombat.enemy.isBoss ?? false,
    );

    // Research resources
    const enemyTier = updatedCombat.enemy.threat || 1;
    const combatResources = updatedCombat.enemy.isBoss
        ? getBossLootResources(enemyTier)
        : getCombatLootResources(enemyTier);

    if (spaceMonster) {
        combatResources.push({
            type: spaceMonster.huntReward,
            quantity: getSpaceMonsterHuntReward(spaceMonster, enemyTier),
        });
    }

    if (combatResources.length > 0) {
        set((s) => {
            combatResources.forEach((res) => {
                s.research.resources[
                    res.type as keyof typeof s.research.resources
                ] =
                    (s.research.resources[
                        res.type as keyof typeof s.research.resources
                    ] || 0) + res.quantity;
            });
        });
        combatResources.forEach((res) => {
            if (res.quantity > 0) {
                get().addLog( i18nStore.t("game_logs.playerVictory_8", { icon: RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].icon, name: RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].name, quantity: res.quantity }),
                    "info",
                );
            }
        });
    }

    // Crew experience
    const gunner = state.crew.find(
        (c) =>
            c.profession === "gunner" ||
            (c.profession === "pilot" &&
                getActiveAssignment(c, true) === "targeting"),
    );
    if (gunner) {
        get().gainExp(
            gunner,
            BASE_GUNNER_COMBAT_EXP + enemyTier * GUNNER_COMBAT_EXP_PER_TIER,
        );
        get().addLog( i18nStore.t("game_logs.playerVictory_9", { gunner_name: gunner.name }), "info");
    }

    const weaponBayCrew = state.crew.filter(
        (c) =>
            weaponBays.some((wb) => wb.id === c.moduleId) &&
            c.id !== gunner?.id,
    );
    weaponBayCrew.forEach((c) => get().gainExp(c, WEAPON_BAY_CREW_EXP));

    // Мутация от босса: шанс BOSS_PER_TIER * тир босса для каждого члена экипажа
    if (updatedCombat.enemy.isBoss && enemyTier >= 2) {
        const mutationChance = Math.min(
            MUTATION_CHANCES.BOSS_MAX,
            MUTATION_CHANCES.BOSS_PER_TIER * enemyTier,
        );
        state.crew.forEach((crewMember) => {
            if (Math.random() < mutationChance) {
                const mutationName = giveRandomMutation(crewMember, set);
                if (mutationName) {
                    get().addLog( i18nStore.t("game_logs.playerVictory_10", { crewMember_name: crewMember.name, mutationName }),
                        "error",
                    );
                    showHintOnce(get().addLog, "first_mutation", "hints.first_mutation");
                }
            }
        });
    }

    // Mark location as completed
    if (get().currentLocation) {
        set((s) => ({
            completedLocations: [
                ...s.completedLocations,
                get().currentLocation?.id || "",
            ],
        }));
    }
    get().checkVictory();

    // Reset combat assignments
    set((s) => {
        s.crew.forEach((c) => {
            c.combatAssignment = null;
            c.combatAssignmentEffect = null;
        });
    });

    // Set battle results
    const battleResult: BattleResult = {
        victory: true,
        enemyName: updatedCombat.enemy.name,
        creditsEarned: loot.credits,
        modulesDamaged: damagedModules,
        modulesDestroyed: destroyedModules,
        crewWounded: woundedCrew,
        crewKilled: [],
        artifactFound: artifactName,
        researchResources: combatResources,
    };

    // Handle self_damage negative effect (e.g., Overload Matrix)
    state.artifacts.forEach((artifact) => {
        if (
            artifact.cursed &&
            artifact.effect.active &&
            artifact.negativeEffect?.type === "self_damage"
        ) {
            const damageValue = artifact.negativeEffect.value ?? 75;
            if (state.ship.modules.length === 0) return;

            const randomModuleIdx = Math.floor(
                Math.random() * state.ship.modules.length,
            );
            set((s) => {
                const mod = s.ship.modules[randomModuleIdx];
                if (mod) mod.health = Math.max(1, mod.health - damageValue);
            });
            const targetModule = state.ship.modules[randomModuleIdx];
            get().addLog( i18nStore.t("game_logs.playerVictory_11", { artifact_name: artifact.name, targetModule_name: targetModule.name, damageValue }),
                "warning",
            );
        }
    });

    // Defender combat victory: +60 rep with the defending race (enough to leave hostile range)
    // But NOT if player attacked a friendly ship (combatTargetLocationId is set)
    if (updatedCombat.defenderRace && !updatedCombat.combatTargetLocationId) {
        get().changeReputation(updatedCombat.defenderRace, 60);
        get().addLog( i18nStore.t("game_logs.playerVictory_12"),
            "info",
        );
        // If the defended location was a planet, permanently ban it
        const defLoc = get().currentLocation;
        if (defLoc?.type === "planet") {
            const planetId = defLoc.id;
            set((s) => {
                if (!s.bannedPlanets.includes(planetId)) {
                    s.bannedPlanets.push(planetId);
                }
            });
            get().addLog( i18nStore.t("game_logs.playerVictory_13", { defLoc_name: defLoc.name }),
                "warning",
            );
        }
    }

    // Player attacked a friendly ship — remove that ship's location
    if (updatedCombat.combatTargetLocationId) {
        const targetId = updatedCombat.combatTargetLocationId;
        const sectorId = get().currentSector?.id;
        set((s) => {
            if (s.currentSector) {
                s.currentSector.locations = s.currentSector.locations.filter(
                    (l) => l.id !== targetId,
                );
            }
            if (sectorId !== undefined) {
                s.galaxy.sectors = s.galaxy.sectors.map((sec) =>
                    sec.id === sectorId
                        ? {
                              ...sec,
                              locations: sec.locations.filter(
                                  (l) => l.id !== targetId,
                              ),
                          }
                        : sec,
                );
            }
        });
        get().addLog( i18nStore.t("game_logs.playerVictory_14"), "warning");
    }

    set((s) => ({
        battleResult,
        currentCombat: null,
        ship: { ...s.ship, shields: s.ship.maxShields },
        gameMode: "battle_results",
    }));

    applyCombatTimeCost(combatRound, set, get);
    get().updateShipStats();
}
