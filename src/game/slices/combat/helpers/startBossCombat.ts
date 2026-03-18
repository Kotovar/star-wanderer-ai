import { getBossById } from "@/game/bosses";
import { determineBossRewards } from "./bossRewards";
import * as combatSetup from "./combatSetup";
import type { GameState, GameStore, Location } from "@/game/types";

/**
 * Инициализирует бой с боссом
 */
export function initializeBossCombat(
    bossLocation: Location,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    const boss = getBossById(bossLocation.bossId ?? "");
    if (!boss) return;

    const bossModules = boss.modules.map((m, idx) => ({
        id: idx,
        type: m.type,
        name: m.name,
        health: m.health,
        maxHealth: m.health,
        damage: m.damage ?? 0,
        defense: m.defense ?? 0,
        isAncient: m.isAncient,
        specialEffect: m.specialEffect,
    }));

    // Determine boss rewards (artifact rarity and module by tier)
    const rewards = determineBossRewards(boss.id, boss.tier, get());
    const lootCredits = combatSetup.calculateBossLoot(boss.tier);

    set((s) => {
        s.ship.shields = s.ship.maxShields;
        s.currentCombat = {
            enemy: {
                name: boss.name,
                modules: bossModules,
                selectedModule: null,
                shields: boss.shields,
                maxShields: boss.shields,
                isBoss: true,
                bossId: boss.id,
                regenRate: boss.regenRate,
                specialAbility: boss.specialAbility,
            },
            loot: {
                credits: lootCredits,
                guaranteedArtifact: rewards.artifactId,
                module: rewards.module,
            },
            droneStacks: 0,
            isAmbush: false,
            ambushAttackDone: false,
        };
        s.gameMode = "combat";
    });

    get().addLog(`Щиты восстановлены: ${get().ship.shields}`, "combat");
    get().addLog(`⚠️ БОСС: ${boss.name}!`, "error");
}
