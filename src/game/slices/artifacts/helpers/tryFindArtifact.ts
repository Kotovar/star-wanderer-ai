import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, Artifact, SetState } from "@/game/types";
import { playSound } from "@/sounds";
import {
    getRandomUndiscoveredArtifact,
    getCrewTraitArtifactBonus,
} from "@/game/artifacts";
import { sumRaceTraitEffect } from "@/game/races";
import { ARTIFACT_FIND_BASE_CHANCE, ARTIFACT_BOOST_BONUS } from "../constants";
import { getTechBonusSum } from "@/game/research";

export const rollArtifactFind = (
    state: GameStore,
    excludedArtifactIds: readonly string[] = [],
): Artifact | null => {
    const artifactFinderBonus = calculateArtifactFinderBonus(state);
    const tier = state.currentSector?.tier ?? 1;
    const baseChance = ARTIFACT_FIND_BASE_CHANCE * tier * artifactFinderBonus;

    if (Math.random() > baseChance) return null;

    return getRandomUndiscoveredArtifact(
        state.artifacts.filter(
            (artifact) => !excludedArtifactIds.includes(artifact.id),
        ),
    );
};

export const discoverArtifact = (
    artifact: Artifact,
    set: SetState,
    get: () => GameStore,
): void => {
    set((s) => ({
        artifacts: s.artifacts.map((a) =>
            a.id === artifact.id
                ? {
                      ...a,
                      discovered: true,
                      hinted: false,
                      hintSource: undefined,
                      hintedAt: undefined,
                  }
                : a,
        ),
    }));

    completeMiningContracts(set, get, artifact);
};

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
    const artifact = rollArtifactFind(state);
    if (!artifact) return null;

    discoverArtifact(artifact, set, get);
    playSound("world_artifact");
    return artifact;
};

/**
 * Рассчитывает общий бонус к поиску артефактов
 *
 * @param state - Текущее состояние игры
 * @returns Множитель бонуса к поиску
 */
const calculateArtifactFinderBonus = (state: GameStore) => {
    const bonus = getBaseArtifactFinderBonus(state);
    if (bonus <= 1) return bonus;

    // Бонус кристаллических существ (+15% к эффектам артефактов) — по одному
    // множителю на каждого, кто действительно на борту и жив
    const resonance = sumRaceTraitEffect(state.crew, "artifactBonus");
    return resonance > 0 ? 1 + (bonus - 1) * (1 + resonance) : bonus;
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

    // Личный трейт-бонус экипажа (legend) — та же логика, что и getArtifactEffectValue,
    // просто не применялась здесь раньше (эту функцию не переиспользовали ради точности без округления).
    const traitArtifactBonus = getCrewTraitArtifactBonus(state.crew);
    if (traitArtifactBonus > 0) value *= 1 + traitArtifactBonus;

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
export const completeMiningContracts = (
    set: SetState,
    get: () => GameStore,
    artifact: Artifact,
): void => {
    const ready = get().activeContracts.filter(
        (contract) =>
            contract.type === "mining" &&
            contract.isRaceQuest &&
            (!contract.requiredRarities ||
                contract.requiredRarities.includes(artifact.rarity)),
    );
    if (ready.length === 0) return;

    const completedIds = new Set(ready.map((contract) => contract.id));
    const reward = ready.reduce(
        (total, contract) => total + (contract.reward ?? 0),
        0,
    );

    set((s) => ({
        credits: s.credits + reward,
        completedContractIds: [...s.completedContractIds, ...completedIds],
        activeContracts: s.activeContracts.filter(
            (contract) => !completedIds.has(contract.id),
        ),
    }));

    ready.forEach((contract) => {
        get().showContractCompletion({
            contract,
            credits: contract.reward,
            reputationChanges: [],
            experience: [],
        });
        get().addLog( i18nStore.t("game_logs.tryFindArtifact_1", { reward: contract.reward }), "info");
    });
};
