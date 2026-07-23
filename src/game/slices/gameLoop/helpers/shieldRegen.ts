import { getTechBonusSum } from "@/game/research";
import { store as i18nStore } from "@/lib/useTranslation";
import {
    findActiveArtifact,
    getArtifactEffectValue,
    getArtifactShieldRegen,
} from "@/game/artifacts";
import {
    ARTIFACT_TYPES,
    RACES,
    STAR_HAZARD_LEVEL,
    STAR_SHIELD_REGEN_PENALTY_PER_LEVEL,
    STAR_SHIELD_REGEN_PENALTY_THRESHOLD,
} from "@/game/constants";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import type { GameState, GameStore, SetState } from "@/game/types";

/**
 * Штраф к регенерации щитов от излучения опасной звезды (пока корабль
 * стоит в системе; во время перелёта не действует). Множитель, а не
 * фиксированное число — не может быть "перекачан" прокачкой щита.
 */
const getStarHazardRegenMultiplier = (state: GameState): number => {
    if (state.traveling) return 1;
    const hazardLevel = state.currentSector
        ? STAR_HAZARD_LEVEL[state.currentSector.star.type]
        : 0;
    if (hazardLevel < STAR_SHIELD_REGEN_PENALTY_THRESHOLD) return 1;
    return Math.max(0, 1 - hazardLevel * STAR_SHIELD_REGEN_PENALTY_PER_LEVEL);
};

/**
 * Вычисляет базовую регенерацию щитов как сумму shieldRegen всех активных модулей щитов
 * плюс бонус от артефакта "Тёмный Щит"
 */
const getBaseShieldRegen = (state: GameState) => {
    // Регенерация от модулей щитов
    const moduleRegen = state.ship.modules
        .filter((m) => m.type === "shield" && m.health > 0 && !m.disabled)
        .reduce((sum, m) => sum + (m.shieldRegen ?? 4), 0);

    // Регенерация от артефакта "Тёмный Щит" с учётом бонусов науки и ритуалов
    const darkShield = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.DARK_SHIELD,
    );
    const artifactRegen = darkShield
        ? getArtifactShieldRegen(darkShield, state)
        : 0;

    // Временный бонус регенерации от планетарных эффектов (Кристаллины)
    const planetRegen = state.ship.bonusShieldRegen ?? 0;

    return moduleRegen + artifactRegen + planetRegen;
};

/**
 * Собирает процентные бонусы регенерации от расовых traits
 * @returns множитель регенерации (например, 0.05 = +5%)
 */
const getRaceRegenMultiplier = (state: GameState): number => {
    let multiplier = 0;

    state.crew.forEach((c) => {
        const race = RACES[c.race];
        if (!race?.specialTraits) return;

        // Бонус от traits (например, void_shield: +5%)
        const shieldTrait = race.specialTraits.find(
            (t) => t.effects.shieldRegen,
        );
        if (shieldTrait?.effects.shieldRegen) {
            multiplier += Number(shieldTrait.effects.shieldRegen) / 100;
        }
    });

    return multiplier;
};

/**
 * Собирает бонусы от артефактов
 */
const getArtifactRegenBonus = (
    state: GameState,
): { multiplier: number; logs: string[] } => {
    const logs: string[] = [];
    let multiplier = 0;

    // Shield Regenerator: процентный бонус
    const shieldRegenerator = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.SHIELD_REGENERATOR,
    );

    if (shieldRegenerator) {
        const regenBoost = getArtifactEffectValue(shieldRegenerator, state);
        multiplier += regenBoost;
        logs.push(
            `⚡ Регенератор Щитов: +${Math.round(regenBoost * 100)}% к регенерации`,
        );
    }

    // Тёмный Щит: базовая регенерация (уже добавлена в getBaseShieldRegen)
    const darkShield = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.DARK_SHIELD,
    );
    if (darkShield) {
        const regenValue = getArtifactShieldRegen(darkShield, state);
        if (regenValue > 0) {
            logs.push(`🛡️ Тёмный Щит: +${regenValue} к регенерации`);
        }
    }

    return { multiplier, logs };
};

/** Множитель регенерации щитов во время боя (замедлено вдвое) */
const COMBAT_SHIELD_REGEN_MULTIPLIER = 0.5;

/**
 * Регенерация щитов (и в бою, и вне боя; в бою — вдвое медленнее)
 */
export const regenerateShields = (
    state: GameState,
    get: () => GameStore,
    set: SetState,
): void => {
    const oldShields = state.ship.shields;
    if (oldShields >= state.ship.maxShields) return;

    // Собираем все бонусы
    const baseRegen = getBaseShieldRegen(state);
    const raceMultiplier = getRaceRegenMultiplier(state);
    const { multiplier: artifactMultiplier, logs } =
        getArtifactRegenBonus(state);

    // Бонус от сращивания ксеноморфов
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    const mergeMultiplier = (mergeBonus.shieldRegenBonus ?? 0) / 100;

    // Бонус от технологий (shield_regen)
    const techRegenMultiplier = getTechBonusSum(state.research, "shield_regen");

    // Итоговая ёмкость щита с бонусом от сращивания
    const maxShieldsWithBonus = mergeBonus.shieldCapacity
        ? Math.floor(
              state.ship.maxShields * (1 + mergeBonus.shieldCapacity / 100),
          )
        : state.ship.maxShields;

    // В бою регенерация вдвое медленнее
    const combatPenalty = state.currentCombat ? COMBAT_SHIELD_REGEN_MULTIPLIER : 1;

    // Излучение опасной звезды глушит реген, пока корабль стоит в системе
    const hazardMultiplier = getStarHazardRegenMultiplier(state);

    // Применяем процентные бонусы к базовой регенерации
    const totalMultiplier =
        (1 + raceMultiplier + artifactMultiplier + mergeMultiplier + techRegenMultiplier) *
        combatPenalty *
        hazardMultiplier;
    const totalRegen = Math.floor(baseRegen * totalMultiplier);

    // Применяем регенерацию
    set((s) => ({
        ship: {
            ...s.ship,
            shields: Math.min(maxShieldsWithBonus, s.ship.shields + totalRegen),
        },
    }));

    // Логируем
    if (baseRegen > 0 && hazardMultiplier < 1) {
        get().addLog(
            hazardMultiplier === 0
                ? i18nStore.t("game_logs.star_regen_blocked")
                : i18nStore.t("game_logs.star_regen_reduced", { percent: Math.round((1 - hazardMultiplier) * 100) }),
            "warning",
        );
    }
    if (totalRegen > 0) {
        get().addLog( i18nStore.t("game_logs.shieldRegen_1", { totalRegen, shields: get().ship.shields, maxShieldsWithBonus }),
            "info",
        );
    }

    logs.forEach((log) => get().addLog(log, "info"));
};
