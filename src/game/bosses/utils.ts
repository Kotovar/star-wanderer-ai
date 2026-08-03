import { ANCIENT_BOSSES } from "@/game/constants/bosses";
import type { AncientBoss, EnemyModule } from "@/game/types";

// Get boss by ID
export const getBossById = (id: string): AncientBoss | undefined => {
    return ANCIENT_BOSSES.find((b) => b.id === id);
};

export const getBossCombatModules = (boss: AncientBoss): EnemyModule[] => {
    return boss.modules.map((module, id) => ({
        id,
        type: module.type,
        name: module.name,
        health: module.health,
        maxHealth: module.health,
        damage: module.damage ?? 0,
        defense: module.defense ?? 0,
        isAncient: module.isAncient,
        specialEffect: module.specialEffect,
        shieldContribution: module.shieldContribution,
        regenContribution: module.regenContribution,
    }));
};
