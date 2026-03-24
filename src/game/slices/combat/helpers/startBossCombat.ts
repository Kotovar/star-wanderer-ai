import { getBossById } from "@/game/bosses";
import { determineBossRewards } from "./bossRewards";
import * as combatSetup from "./combatSetup";
import { calculateShieldsFromModules } from "./combatSetup";
import { applyPessimistTrait, applyRebelTrait } from "./startCombat";
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
        shieldContribution: m.shieldContribution,
        regenContribution: m.regenContribution,
    }));

    // Shields driven by shield modules — same logic as regular enemies, but bosses are mightier
    const { maxShields: moduleShields, shieldRegenRate } = calculateShieldsFromModules(bossModules);
    const initialShields = moduleShields > 0 ? moduleShields : boss.shields;

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
                shields: initialShields,
                maxShields: initialShields,
                shieldRegenRate: shieldRegenRate > 0 ? shieldRegenRate : undefined,
                isBoss: true,
                bossId: boss.id,
                regenRate: boss.regenRate,
                specialAbility: boss.specialAbility,
                bossAttackCount: 0,
            },
            loot: {
                credits: lootCredits,
                guaranteedArtifact: rewards.artifactId,
                module: rewards.module,
            },
            droneStacks: 0,
            isAmbush: false,
            ambushAttackDone: false,
            skipPlayerTurn: false,
            bossResurrected: false,
            bossOneShotAbilityFired: false,
        };
        s.gameMode = "combat";
    });

    get().addLog(`Щиты восстановлены: ${get().ship.shields}`, "combat");
    get().addLog(`⚠️ БОСС: ${boss.name}!`, "error");

    applyPessimistTrait(get, set);
    applyRebelTrait(get, set);
}
