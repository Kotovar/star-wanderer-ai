import { ANCIENT_BOSSES } from "@/game/constants/bosses";
import type { AncientBoss, GalaxyTierAll } from "@/game/types";

/**
 * Менеджер распределения боссов по галактике
 * Гарантирует уникальность боссов и минимальное количество по тирам
 */
class BossDistributionManager {
    private usedBossIds = new Set<string>();
    private reservedBossIds = new Set<string>();

    /**
     * Получить случайного босса для тира, исключая уже использованных
     */
    getRandomBossForTier(tier: GalaxyTierAll): AncientBoss | null {
        const eligibleBosses = ANCIENT_BOSSES.filter(
            (b) =>
                b.tier === tier &&
                !this.usedBossIds.has(b.id) &&
                !this.reservedBossIds.has(b.id),
        );

        if (eligibleBosses.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * eligibleBosses.length);
        return eligibleBosses[randomIndex];
    }

    /** Получить неиспользованного босса для чёрной дыры. */
    getRandomBossForBlackHole(): AncientBoss | null {
        const eligibleBosses = ANCIENT_BOSSES.filter(
            (b) =>
                b.tier <= 3 &&
                !this.usedBossIds.has(b.id) &&
                !this.reservedBossIds.has(b.id),
        );

        if (eligibleBosses.length === 0) return null;

        return eligibleBosses[Math.floor(Math.random() * eligibleBosses.length)];
    }

    /**
     * Отметить босса как использованного
     */
    markBossAsUsed(bossId: string): void {
        this.usedBossIds.add(bossId);
    }

    /** Исключает уникальных боссов из случайной раздачи до их гарантированного размещения. */
    reserveBosses(...bossIds: string[]): void {
        bossIds.forEach((bossId) => this.reservedBossIds.add(bossId));
    }

    /**
     * Проверить, был ли босс уже использован
     */
    isBossUsed(bossId: string): boolean {
        return this.usedBossIds.has(bossId);
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
        this.reservedBossIds.clear();
    }
}

// Глобальный экземпляр для использования при генерации галактики
export const bossDistribution = new BossDistributionManager();
