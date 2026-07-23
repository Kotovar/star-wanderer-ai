import { store as i18nStore } from "@/lib/useTranslation";
import { getBossById, getBossCombatModules } from "@/game/bosses";
import {
    addEnemyCodexEntry,
    getBossCodexId,
} from "@/game/constants/enemyCodex";
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

    const bossModules = getBossCombatModules(boss);

    // Shields driven by shield modules — same logic as regular enemies, but bosses are mightier
    const { maxShields: moduleShields, shieldRegenRate } = calculateShieldsFromModules(bossModules);
    const initialShields = moduleShields > 0 ? moduleShields : boss.shields;

    // Determine boss rewards (artifact rarity and module by tier)
    const rewards = determineBossRewards(boss.id, boss.tier, get());
    const lootCredits = combatSetup.calculateBossLoot(
        boss.tier,
        boss.lootMultiplier,
    );

    set((s) => {
        s.ship.shields = s.ship.maxShields;
        s.discoveredEnemyCodexIds = addEnemyCodexEntry(
            s.discoveredEnemyCodexIds,
            getBossCodexId(boss.id),
        );
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
            round: 1,
            droneStacks: 0,
            isAmbush: false,
            ambushAttackDone: false,
            skipPlayerTurn: false,
            bossResurrected: false,
            bossOneShotAbilityFired: false,
        };
        s.gameMode = "combat";
    });

    get().addLog( i18nStore.t("game_logs.startBossCombat_1", { shields: get().ship.shields }), "combat");
    get().addLog( i18nStore.t("game_logs.startBossCombat_2", { boss_name: boss.name }), "error");

    applyPessimistTrait(get, set);
    applyRebelTrait(get, set);
}
