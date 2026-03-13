import {
    ARTIFACT_TYPES,
    CONTRACT_REWARDS,
    RESEARCH_RESOURCES,
} from "@/game/constants";
import {
    getCombatLootResources,
    getBossLootResources,
} from "@/game/research/utils";
import { giveCrewExperience, getActiveAssignment } from "@/game/crew";
import type {
    GameState,
    GameStore,
    CargoItem,
    BattleResult,
} from "@/game/types";
import { findActiveArtifact } from "@/game/artifacts";
import { completeBattleContracts } from "./completeBattleContracts";

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
    const loot = updatedCombat.loot;

    // Boss resurrect chance
    if (
        updatedCombat.enemy.isBoss &&
        updatedCombat.enemy.specialAbility?.effect === "resurrect_chance"
    ) {
        const resurrectChance =
            (updatedCombat.enemy.specialAbility.value ?? 20) / 100;
        if (Math.random() < resurrectChance) {
            get().addLog(`⚠️ ${updatedCombat.enemy.name} ВОСКРЕСАЕТ!`, "error");
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.enemy.modules.forEach((m) => {
                    m.health = Math.floor((m.maxHealth || 100) * 0.3);
                });
                s.currentCombat.enemy.shields = Math.floor(
                    s.currentCombat.enemy.maxShields * 0.3,
                );
            });
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

    // Calculate credits
    let creditsAmount = loot.credits;

    const blackBox = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.BLACK_BOX,
    );

    if (blackBox) {
        const boostValue = blackBox.effect.value ?? 0;
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
        get().addLog(
            `📦 Чёрный Ящик: +${creditsAmount - loot.credits}₢ бонус`,
            "info",
        );
    }
    if (lootBonus > 0) {
        get().addLog(
            `★ Удачливый экипаж: +${Math.round(lootBonus * 100)}% к награде)`,
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
                    if (a.id === loot.guaranteedArtifact) a.discovered = true;
                });
            });
        }
    }

    // Complete mining contract (Crystalline race quest - find artifact after boss defeat)
    const miningContract = get().activeContracts.find(
        (c) => c.type === "mining" && c.isRaceQuest && c.bossDefeated,
    );
    if (miningContract) {
        set((s) => ({
            credits: s.credits + (miningContract.reward || 0),
        }));
        get().addLog(
            `💎 Контракт "${miningContract.desc}" выполнен! +${miningContract.reward}₢`,
            "info",
        );
        giveCrewExperience(
            CONTRACT_REWARDS.mining.baseExp,
            `Экипаж получил опыт: +${CONTRACT_REWARDS.mining.baseExp} ед.`,
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
        get().addLog(
            `🎁 Награда за босса: Получен модуль "${moduleName}"!`,
            "info",
        );
        get().addLog(
            `📦 Модуль помещён в трюм. Посетите станцию для установки.`,
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
    let combatResources = getCombatLootResources(enemyTier);
    if (updatedCombat.enemy.isBoss) {
        combatResources = [
            ...combatResources,
            ...getBossLootResources(enemyTier),
        ];
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
                get().addLog(
                    `🔧 Получены исследовательские ресурсы: ${RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].icon} ${RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].name} x${res.quantity}`,
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
        get().gainExp(gunner, 10 + enemyTier * 5);
        get().addLog(`${gunner.name} получил боевой опыт!`, "info");
    }

    const weaponBayCrew = state.crew.filter(
        (c) =>
            weaponBays.some((wb) => wb.id === c.moduleId) &&
            c.id !== gunner?.id,
    );
    weaponBayCrew.forEach((c) => get().gainExp(c, 5));

    // Mark location as completed
    if (get().currentLocation) {
        set((s) => ({
            completedLocations: [
                ...s.completedLocations,
                get().currentLocation?.id || "",
            ],
        }));
    }

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
    };

    const criticalOverload = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.CRITICAL_OVERLOAD,
    );

    if (criticalOverload && state.ship.modules.length > 0) {
        const negativeValue = (criticalOverload.effect.value as number) ?? 0;
        const randomModuleIdx = Math.floor(
            Math.random() * state.ship.modules.length,
        );
        set((s) => {
            const mod = s.ship.modules[randomModuleIdx];
            if (mod) mod.health = Math.max(1, mod.health - negativeValue);
        });
        const targetModule = state.ship.modules[randomModuleIdx];
        get().addLog(
            `⚠️ ${criticalOverload.name}: ${targetModule.name} повреждён на -${negativeValue}% после боя`,
            "warning",
        );
    }

    set((s) => ({
        battleResult,
        currentCombat: null,
        ship: { ...s.ship, shields: s.ship.maxShields },
        gameMode: "battle_results",
    }));

    get().updateShipStats();
}
