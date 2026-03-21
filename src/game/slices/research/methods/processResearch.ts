import { RESEARCH_TREE } from "@/game/constants";
import { getAdjacentTechs } from "@/game/research/utils";
import { playSound } from "@/sounds";
import {
    calculateResearchOutput,
    calculateTurnsRemaining,
    applyTechnologyBonuses,
    getTechnologyBonusesDescription,
    getBonusLogMessages,
} from "../helpers/researchHelpers";
import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import type { GameStore, SetState, TechnologyId } from "@/game/types";
import type { CraftingRecipeId } from "@/game/types/crafting";

/**
 * Обрабатывает завершение исследования
 *
 * @param techId - ID завершённой технологии
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 */
const handleResearchCompletion = (
    techId: TechnologyId,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const completedTech = RESEARCH_TREE[techId];

    // Применяем бонусы технологии
    const { appliedBonuses, newModules, newCrew } = applyTechnologyBonuses(
        state,
        techId,
    );

    // Проверяем бонусы на новое оружие (крафтинг)
    const newWeaponBonus = completedTech.bonuses.find(
        (b: { type: string }) => b.type === "new_weapon",
    );
    const WEAPON_RECIPE_MAP: Record<string, string> = {
        plasma_weapons: "plasma",
        combat_drones: "drones",
        antimatter_weapons: "antimatter",
        quantum_torpedo: "quantum_torpedo",
    };
    const unlockedRecipeId = (WEAPON_RECIPE_MAP[techId] ?? null) as CraftingRecipeId | null;

    // Обновляем состояние с применёнными бонусами
    set((s) => ({
        ship: {
            ...s.ship,
            modules: newModules,
        },
        crew: newCrew,
        research: {
            ...s.research,
            researchedTechs: [...s.research.researchedTechs, techId],
            discoveredTechs: [
                ...new Set([
                    ...s.research.discoveredTechs,
                    ...getAdjacentTechs(techId),
                ]),
            ],
            activeResearch: null,
            unlockedRecipes: unlockedRecipeId && newWeaponBonus
                ? [...(s.research.unlockedRecipes ?? []), unlockedRecipeId]
                : (s.research.unlockedRecipes ?? []),
        },
    }));

    // Логирование завершения
    get().addLog(`✅ Исследование завершено: ${completedTech.name}`, "info");
    get().addLog(
        `Получены бонусы: ${getTechnologyBonusesDescription(completedTech)}`,
        "info",
    );

    // Логи о применённых бонусах
    const bonusMessages = getBonusLogMessages(appliedBonuses);
    bonusMessages.forEach(({ message, needsShipStatsUpdate }) => {
        get().addLog(message, "info");
        if (needsShipStatsUpdate) {
            get().updateShipStats();
        }
    });

    playSound("success");

    // Завершаем квест синтетиков (исследование технологии нужного тира)
    const synthContract = get().activeContracts.find((c) => {
        if (!(c.type === "research" && c.isRaceQuest && c.requiresTechResearch))
            return false;
        const minTier = c.requiredTechTier ?? 1;
        return completedTech.tier >= minTier;
    });
    if (synthContract) {
        const reward = synthContract.reward || 0;
        set((s) => ({
            credits: s.credits + reward,
            completedContractIds: [
                ...s.completedContractIds,
                synthContract.id,
            ],
            activeContracts: s.activeContracts.filter(
                (ac) => ac.id !== synthContract.id,
            ),
        }));
        const expReward = CONTRACT_REWARDS.research.baseExp;
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);
        get().addLog(
            `🤖 Исследование для задания завершено! +${reward}₢`,
            "info",
        );
    }

    // Логирование открытия новых технологий
    const adjacent = getAdjacentTechs(techId);
    adjacent.forEach((adjTechId) => {
        if (!state.research.discoveredTechs.includes(adjTechId)) {
            get().addLog(
                `📖 Открыта технология: ${RESEARCH_TREE[adjTechId as TechnologyId].name}`,
                "info",
            );
        }
    });
};

/**
 * Обрабатывает продолжение исследования
 *
 * @param newProgress - Новый прогресс исследования
 * @param scienceCost - Стоимость технологии в очках науки
 * @param researchOutput - Производительность исследования
 * @param set - Функция для обновления состояния
 */
const handleResearchProgress = (
    newProgress: number,
    scienceCost: number,
    researchOutput: number,
    set: SetState,
): void => {
    const turnsRemaining = calculateTurnsRemaining(
        newProgress,
        scienceCost,
        researchOutput,
    );

    set((state) => ({
        research: {
            ...state.research,
            activeResearch: state.research.activeResearch
                ? {
                      ...state.research.activeResearch,
                      progress: newProgress,
                      turnsRemaining,
                  }
                : null,
        },
    }));
};

/**
 * Обрабатывает исследование каждый ход
 *
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 */
export const processResearch = (set: SetState, get: () => GameStore): void => {
    const state = get();

    // Если нет активного исследования, ничего не делаем
    if (!state.research.activeResearch) return;

    const techId = state.research.activeResearch.techId;
    const tech = RESEARCH_TREE[techId];
    if (!tech) return;

    // Вычисляем производительность исследования
    const researchOutput = calculateResearchOutput(state);

    // Вычисляем новый прогресс
    const newProgress = Math.min(
        tech.scienceCost,
        state.research.activeResearch.progress + researchOutput.totalOutput,
    );

    // Проверяем, завершено ли исследование
    if (newProgress >= tech.scienceCost) {
        handleResearchCompletion(techId, set, get);
    } else {
        handleResearchProgress(
            newProgress,
            tech.scienceCost,
            researchOutput.totalOutput,
            set,
        );
    }
};
