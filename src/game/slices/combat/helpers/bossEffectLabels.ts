import { store as i18nStore } from "@/lib/useTranslation";
import type { BossModuleEffectType } from "@/game/types/bosses";
import type { EnemyModule } from "@/game/types/enemy";

/** Эффекты, выраженные флэт-числом, а не процентом */
const FLAT_EFFECTS = new Set<BossModuleEffectType>([
    "damage_aura",
    "shield_break",
    "shield_regen",
]);

/** Булевы эффекты — value лишь включает/выключает, а не масштабирует */
const BOOLEAN_EFFECTS = new Set<BossModuleEffectType>(["ignore_defense"]);

function formatBossEffectValue(
    type: BossModuleEffectType,
    value: number,
): string {
    if (BOOLEAN_EFFECTS.has(type)) return "";
    if (type === "multi_hit") return `×${value}`;
    if (type === "guaranteed_crit")
        return i18nStore.t("combat.boss_effects.every_nth", { n: value });
    if (FLAT_EFFECTS.has(type)) return `${value}`;
    return `${value}%`;
}

export interface BossModulePassive {
    moduleId: number;
    moduleName: string;
    type: BossModuleEffectType;
    label: string;
    valueText: string;
}

/**
 * Собирает пассивные способности живых модулей босса для отображения игроку
 * ДО того, как они впервые сработают в бою (сейчас игрок узнаёт о них только
 * постфактум, из лога). Показывает по одной записи на модуль — без агрегации
 * (max/сумма), которую использует боевая логика для самого броска, чтобы не
 * дублировать эти правила в UI.
 */
export function getBossModulePassives(
    aliveBossModules: EnemyModule[],
): BossModulePassive[] {
    return aliveBossModules
        .filter(
            (m): m is EnemyModule & { specialEffect: NonNullable<EnemyModule["specialEffect"]> } =>
                !!m.specialEffect,
        )
        .map((m) => {
            const effect = m.specialEffect;
            return {
                moduleId: m.id,
                moduleName: m.name,
                type: effect.type,
                label: i18nStore.t(`combat.boss_effects.${effect.type}`),
                valueText: formatBossEffectValue(effect.type, effect.value),
            };
        });
}
