import type { GameStore, Artifact, SetState } from "@/game/types";
import { playSound } from "@/sounds";
import { getRandomUndiscoveredArtifact } from "@/game/artifacts";
import { RACES } from "@/game/constants/races";
import { ARTIFACT_FIND_BASE_CHANCE, ARTIFACT_BOOST_BONUS } from "../constants";
import { getTechBonusSum } from "@/game/research";

/**
 * Пытается найти артефакт (шанс зависит от тира сектора и бонусов)
 *
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns Найденный артефакт или null
 */
export const tryFindArtifact = (
    state: GameStore,
    set: SetState,
    get: () => GameStore,
): Artifact | null => {
    // Проверяем бонус к поиску артефактов
    const artifactFinderBonus = calculateArtifactFinderBonus(state);

    // Базовый шанс зависит от тира сектора и бонусов
    const tier = state.currentSector?.tier ?? 1;
    const baseChance = ARTIFACT_FIND_BASE_CHANCE * tier * artifactFinderBonus;

    if (Math.random() > baseChance) return null;

    const artifact = getRandomUndiscoveredArtifact(state.artifacts);
    if (!artifact) return null;

    // Помечаем артефакт как обнаруженный
    set((s) => ({
        artifacts: s.artifacts.map((a) =>
            a.id === artifact.id ? { ...a, discovered: true } : a,
        ),
    }));

    // Завершаем контракт на добычу (кристаллический квест)
    completeMiningContractIfActive(set, get);

    playSound("success");
    return artifact;
};

/**
 * Рассчитывает общий бонус к поиску артефактов
 *
 * @param state - Текущее состояние игры
 * @returns Множитель бонуса к поиску
 */
const calculateArtifactFinderBonus = (state: GameStore) => {
    let bonus = getBaseArtifactFinderBonus(state);

    // Применяем бонус кристаллических существ (+15% к эффектам артефактов)
    state.crew.forEach((c) => {
        const race = RACES[c.race];
        if (race?.specialTraits) {
            const trait = race.specialTraits.find(
                (t) => t.id === "resonance" && t.effects.artifactBonus,
            );
            if (trait && bonus > 1) {
                bonus =
                    1 + (bonus - 1) * (1 + Number(trait.effects.artifactBonus));
            }
        }
    });

    return bonus;
};

/**
 * Получает базовый бонус к поиску артефактов от артефактов
 *
 * @param state - Текущее состояние игры
 * @returns Базовый множитель бонуса
 */
const getBaseArtifactFinderBonus = (state: GameStore): number => {
    const artifactFinder = state.artifacts.find(
        (a) => a.effect.type === "artifact_finder" && a.effect.active,
    );
    if (!artifactFinder) return 1;

    // Use raw float multiplication (no Math.floor) so research/ritual bonuses
    // are preserved and applied to the probability, not truncated
    let value = artifactFinder.effect.value ?? 1;

    const researchBoost = getTechBonusSum(state.research, "artifact_effect_boost");
    if (researchBoost > 0) value *= 1 + researchBoost;

    const boostEffect = state.activeEffects.find(
        (e) =>
            e.effects.some((ef) => ef.type === "artifact_boost") &&
            e.targetArtifactId === artifactFinder.id,
    );
    if (boostEffect) {
        const boostValue =
            (boostEffect.effects.find((ef) => ef.type === "artifact_boost")
                ?.value as number) ?? ARTIFACT_BOOST_BONUS;
        value *= 1 + boostValue;
    }

    return value;
};

/**
 * Завершает активный контракт на добычу кристаллов (расовый квест кристаллических)
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const completeMiningContractIfActive = (
    set: SetState,
    get: () => GameStore,
): void => {
    const miningContract = get().activeContracts.find(
        (c) => c.type === "mining" && c.isRaceQuest,
    );

    if (!miningContract) return;

    const reward = miningContract.reward || 0;

    set((s) => ({
        credits: s.credits + reward,
        completedContractIds: [...s.completedContractIds, miningContract.id],
        activeContracts: s.activeContracts.filter(
            (ac) => ac.id !== miningContract.id,
        ),
    }));

    get().addLog(`Кристалл Древних найден! +${reward}₢`, "info");
};
