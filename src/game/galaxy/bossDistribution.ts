import { ANCIENT_BOSSES } from "@/game/constants/bosses";
import type { AncientBoss, GalaxyTierAll, GalaxyTierBase } from "@/game/types";

/**
 * Менеджер распределения боссов по галактике
 * Гарантирует уникальность боссов и минимальное количество по тирам
 */
export class BossDistributionManager {
    private usedBossIds = new Set<string>();
    private guaranteedBossesPlaced: Record<number, boolean> = {
        1: false,
        2: false,
        3: false,
    };

    /**
     * Получить случайного босса для тира, исключая уже использованных
     */
    getRandomBossForTier(tier: GalaxyTierAll): AncientBoss | null {
        const eligibleBosses = ANCIENT_BOSSES.filter(
            (b) => b.tier <= tier && !this.usedBossIds.has(b.id),
        );

        if (eligibleBosses.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * eligibleBosses.length);
        return eligibleBosses[randomIndex];
    }

    /**
     * Получить гарантированного босса для тира (уникального)
     */
    getGuaranteedBossForTier(tier: GalaxyTierBase): AncientBoss | null {
        const eligibleBosses = ANCIENT_BOSSES.filter(
            (b) => b.tier === tier && !this.usedBossIds.has(b.id),
        );

        if (eligibleBosses.length === 0) return null;

        const boss = eligibleBosses[0];
        return boss;
    }

    /**
     * Отметить босса как использованного
     */
    markBossAsUsed(bossId: string): void {
        this.usedBossIds.add(bossId);
    }

    /**
     * Проверить, был ли босс уже использован
     */
    isBossUsed(bossId: string): boolean {
        return this.usedBossIds.has(bossId);
    }

    /**
     * Отметить гарантированного босса как размещённого
     */
    markGuaranteedBossPlaced(tier: 1 | 2 | 3): void {
        this.guaranteedBossesPlaced[tier] = true;
    }

    /**
     * Проверить, размещён ли гарантированный босс для тира
     */
    isGuaranteedBossPlaced(tier: 1 | 2 | 3): boolean {
        return this.guaranteedBossesPlaced[tier];
    }

    /**
     * Получить количество уже размещённых боссов
     */
    getUsedBossesCount(): number {
        return this.usedBossIds.size;
    }

    /**
     * Получить список всех доступных боссов (не использованных)
     */
    getAvailableBosses(): AncientBoss[] {
        return ANCIENT_BOSSES.filter((b) => !this.usedBossIds.has(b.id));
    }

    /**
     * Получить босса по ID
     */
    getBossById(id: string): AncientBoss | undefined {
        return ANCIENT_BOSSES.find((b) => b.id === id);
    }

    /**
     * Сбросить состояние (для новой игры)
     */
    reset(): void {
        this.usedBossIds.clear();
        this.guaranteedBossesPlaced = {
            1: false,
            2: false,
            3: false,
        };
    }
}

// Глобальный экземпляр для использования при генерации галактики
export const bossDistribution = new BossDistributionManager();
