import {
    ASTEROID_COLLISION_DRILL_DAMAGE,
    ASTEROID_INSTABILITY_PER_PASS,
    ASTEROID_PASSES_BY_TIER,
    getAsteroidCollisionChance,
    getAsteroidPassShare,
} from "../constants";
import type { AsteroidTier } from "@/game/types";

export interface AsteroidPassInput {
    /** Тир пояса — определяет число проходов */
    asteroidTier: AsteroidTier;
    /** Уже выполненные проходы */
    passesDone: number;
    /** Накопленная нестабильность пояса */
    instability: number;
    /** Объявленные запасы пояса целиком */
    resources: { minerals: number; rare: number; credits: number };
    /** Итоговый множитель эффективности бура (тир, износ, бонусы) */
    efficiency: number;
    /** Бур ниже тира: поверхностный сбор, без риска и без нестабильности */
    surfaceOnly: boolean;
    /** Текущее здоровье бура */
    drillHealth: number;
    /** Бросок столкновения в [0, 1) — вынесен наружу ради детерминизма в тестах */
    collisionRoll: number;
}

export interface AsteroidPassResult {
    minerals: number;
    rare: number;
    credits: number;
    /** Столкновение с обломками на этом проходе */
    collided: boolean;
    /** Урон, нанесённый буру (0, если столкновения не было) */
    drillDamage: number;
    /** Здоровье бура после прохода */
    nextDrillHealth: number;
    nextPassesDone: number;
    nextInstability: number;
    /** Проходы закончились — пояс выработан */
    exhausted: boolean;
    /** Бур добит: дальше копать нечем, пока его не починят */
    drillDestroyed: boolean;
}

/**
 * Считает один проход по поясу астероидов.
 *
 * Ставка проходов: залежи глубже богаче, но каждый глубокий проход поднимает
 * нестабильность, а столкновение бьёт именно по буру — по тому самому
 * инструменту, которым идёт добыча. Поэтому «ещё один проход» — настоящий
 * вопрос, а не решённый оптимум: рискуешь ровно тем, от чего зависишь.
 *
 * Функция чистая: и бросок столкновения, и состояние приходят снаружи.
 */
export const resolveAsteroidPass = (
    input: AsteroidPassInput,
): AsteroidPassResult => {
    const {
        asteroidTier,
        passesDone,
        instability,
        resources,
        efficiency,
        surfaceOnly,
        drillHealth,
        collisionRoll,
    } = input;

    const share = getAsteroidPassShare(passesDone);
    const yieldOf = (amount: number) =>
        Math.floor(Math.max(0, amount) * share * Math.max(0, efficiency));

    const collided =
        collisionRoll < getAsteroidCollisionChance(instability, surfaceOnly);
    const drillDamage = collided ? ASTEROID_COLLISION_DRILL_DAMAGE : 0;
    const nextDrillHealth = Math.max(0, drillHealth - drillDamage);

    const nextPassesDone = passesDone + 1;
    const nextInstability = surfaceOnly
        ? instability
        : instability + ASTEROID_INSTABILITY_PER_PASS;

    return {
        minerals: yieldOf(resources.minerals),
        rare: yieldOf(resources.rare),
        credits: yieldOf(resources.credits),
        collided,
        drillDamage,
        nextDrillHealth,
        nextPassesDone,
        nextInstability,
        exhausted: nextPassesDone >= ASTEROID_PASSES_BY_TIER[asteroidTier],
        drillDestroyed: nextDrillHealth <= 0,
    };
};
