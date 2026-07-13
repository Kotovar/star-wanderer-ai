import type { SetState, GameStore, AnomalyApproach } from "@/game/types";
import {
    ANOMALY_BASE_REWARD_PER_LEVEL,
    ANOMALY_RANDOM_REWARD_MAX,
    ANOMALY_BASE_DAMAGE_PER_LEVEL,
    ANOMALY_RANDOM_DAMAGE_MAX,
    ANOMALY_MIN_MODULE_HEALTH,
    ANOMALY_APPROACH_CONFIG,
} from "../constants";
import { calculateScienceBonus } from "./calculateScienceBonus";
import { getCrewByProfession, giveRandomMutation } from "@/game/crew";
import { MUTATION_CHANCES } from "@/game/constants";
import { getRandomUndiscoveredArtifact } from "@/game/artifacts";
import { grantTimedEffect } from "@/game/effects/timedEffects";

/**
 * Применяет эффект аномалии (награда или урон), масштабируя по подходу
 *
 * @param anomalyLevel - Уровень сложности аномалии
 * @param anomalyType - Тип аномалии ("good" или "bad")
 * @param approach - Подход к исследованию
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const applyAnomalyEffect = (
    anomalyLevel: number,
    anomalyType: string,
    approach: AnomalyApproach,
    set: SetState,
    get: () => GameStore,
): void => {
    const config = ANOMALY_APPROACH_CONFIG[approach];
    const scientists = getCrewByProfession(get().crew, "scientist");
    const scienceBonus = calculateScienceBonus(scientists);
    const rewardMultiplier = (1 + scienceBonus) * config.rewardMult;

    if (anomalyType === "good") {
        applyGoodAnomaly(
            anomalyLevel,
            rewardMultiplier,
            scienceBonus,
            set,
            get,
        );
        grantTimedEffect("anomaly_resonance", set, get);
    } else {
        applyBadAnomaly(anomalyLevel, config.damageMult, config.artifactBonus, set, get);
        grantTimedEffect("anomaly_interference", set, get);
        // Шанс мутации для учёных, масштабируемый подходом
        if (config.mutationMult > 0) {
            const baseChance = Math.min(
                MUTATION_CHANCES.ANOMALY_MAX,
                MUTATION_CHANCES.ANOMALY_PER_LEVEL * anomalyLevel,
            );
            const mutationChance = baseChance * config.mutationMult;
            scientists.forEach((scientist) => {
                if (Math.random() < mutationChance) {
                    const mutationName = giveRandomMutation(scientist, set);
                    if (mutationName) {
                        get().addLog(
                            `☣️ ${scientist.name} заразился мутацией от аномалии: ${mutationName}!`,
                            "error",
                        );
                    }
                }
            });
        }
    }
};

/**
 * Применяет эффект хорошей аномалии (денежная награда)
 */
const applyGoodAnomaly = (
    anomalyLevel: number,
    rewardMultiplier: number,
    scienceBonus: number,
    set: SetState,
    get: () => GameStore,
): void => {
    const randomBonus = Math.floor(Math.random() * ANOMALY_RANDOM_REWARD_MAX);
    const baseReward = ANOMALY_BASE_REWARD_PER_LEVEL * anomalyLevel;
    const reward = Math.floor((baseReward + randomBonus) * rewardMultiplier);

    set((s) => ({ credits: s.credits + reward }));

    const bonusText =
        scienceBonus > 0
            ? ` (бонус науки: +${Math.round(scienceBonus * 100)}%)`
            : "";

    get().addLog(`Аномалия: +${reward}₢${bonusText}`, "info");
};

/**
 * Применяет эффект плохой аномалии (повреждение случайного модуля + редкая награда)
 */
const applyBadAnomaly = (
    anomalyLevel: number,
    damageMult: number,
    artifactBonus: number,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const modules = state.ship.modules;

    if (modules.length === 0) return;

    const randomIndex = Math.floor(Math.random() * modules.length);
    const randomModule = modules[randomIndex];

    const randomDamage = Math.floor(Math.random() * ANOMALY_RANDOM_DAMAGE_MAX);
    const baseDamage = ANOMALY_BASE_DAMAGE_PER_LEVEL * anomalyLevel;
    const damage = Math.floor((baseDamage + randomDamage) * damageMult);

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.id === randomModule.id
                    ? {
                          ...m,
                          health: Math.max(
                              ANOMALY_MIN_MODULE_HEALTH,
                              m.health - damage,
                          ),
                      }
                    : m,
            ),
        },
    }));

    get().addLog(`Аномалия: "${randomModule.name}" -${damage}%`, "warning");

    // Редкая награда за риск
    applyBadAnomalyBonus(anomalyLevel, artifactBonus, set, get);
};

/**
 * Выдаёт редкую награду за исследование опасной аномалии.
 * artifactBonus увеличивает шанс выпадения артефакта (0 = базовый 10%).
 */
const applyBadAnomalyBonus = (
    anomalyLevel: number,
    artifactBonus: number,
    set: SetState,
    get: () => GameStore,
): void => {
    const artifactChance = 0.1 + artifactBonus;
    const resourceChance = 0.9 - artifactChance; // сжимаем ресурсы, кредиты остаются
    const roll = Math.random();

    if (roll < 0.6) {
        // 60%: большая кредитная награда (больше чем у хорошей)
        const base = ANOMALY_BASE_REWARD_PER_LEVEL * anomalyLevel * 1.5;
        const bonus = Math.floor(Math.random() * ANOMALY_RANDOM_REWARD_MAX);
        const reward = Math.floor(base + bonus);
        set((s) => ({ credits: s.credits + reward }));
        get().addLog(`💰 Редкая находка в аномалии: +${reward}₢`, "info");
    } else if (roll < resourceChance) {
        // ~30% (меньше при deep dive): редкие научные ресурсы
        const quantumCount = Math.floor(Math.random() * anomalyLevel) + 1;
        const ancientCount = Math.floor(Math.random() * anomalyLevel * 2) + 1;
        set((s) => ({
            research: {
                ...s.research,
                resources: {
                    ...s.research.resources,
                    quantum_crystals: (s.research.resources.quantum_crystals ?? 0) + quantumCount,
                    ancient_data: (s.research.resources.ancient_data ?? 0) + ancientCount,
                },
            },
        }));
        get().addLog(
            `🔬 Редкие образцы из аномалии: Квантовые кристаллы x${quantumCount}, Древние данные x${ancientCount}`,
            "info",
        );
    } else {
        // ~10%+ (больше при deep dive): артефакт
        const artifact = getRandomUndiscoveredArtifact(get().artifacts);
        if (artifact) {
            set((s) => ({
                artifacts: s.artifacts.map((a) =>
                    a.id === artifact.id
                        ? {
                              ...a,
                              discovered: true,
                              hinted: false,
                              hintedAt: undefined,
                          }
                        : a,
                ),
            }));
            get().addLog(
                `✨ Аномалия скрывала артефакт: "${artifact.name}"!`,
                "info",
            );
        } else {
            // Все артефакты уже найдены — компенсация кредитами
            const reward = Math.floor(ANOMALY_BASE_REWARD_PER_LEVEL * anomalyLevel * 2);
            set((s) => ({ credits: s.credits + reward }));
            get().addLog(`💰 Редкая находка в аномалии: +${reward}₢`, "info");
        }
    }
};
