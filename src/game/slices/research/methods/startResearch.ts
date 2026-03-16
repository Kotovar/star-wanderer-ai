import { RESEARCH_TREE, RESEARCH_RESOURCES } from "@/game/constants";
import { playSound } from "@/sounds";
import {
    hasRequiredResources,
    hasLabAndScientist,
    deductResearchResources,
    calculateResearchOutput,
    calculateTurnsRemaining,
} from "../helpers/researchHelpers";
import type { GameStore, SetState, TechnologyId } from "@/game/types";
import { typedKeys } from "@/lib";

/**
 * Интерфейс результата проверки возможности исследования
 */
interface ResearchValidationResult {
    /**
     * Возможно ли начать исследование
     */
    canStart: boolean;

    /**
     * Сообщение об ошибке (если есть)
     */
    errorMessage?: string;

    /**
     * Тип сообщения (error, warning)
     */
    messageType?: "error" | "warning";
}

/**
 * Проверяет, можно ли начать исследование технологии
 *
 * @param state - Текущее состояние игры
 * @param techId - ID технологии для исследования
 * @returns Результат проверки
 */
const validateResearchStart = (
    state: GameStore,
    techId: TechnologyId,
): ResearchValidationResult => {
    const tech = RESEARCH_TREE[techId];

    // Проверка существования технологии
    if (!tech) {
        return {
            canStart: false,
            errorMessage: "Технология не найдена!",
            messageType: "error",
        };
    }

    // Проверка: уже ли изучена
    if (state.research.researchedTechs.includes(techId)) {
        return {
            canStart: false,
            errorMessage: "Технология уже изучена!",
            messageType: "warning",
        };
    }

    // Проверка: уже ли идёт исследование
    if (state.research.activeResearch) {
        const activeTech = RESEARCH_TREE[state.research.activeResearch.techId];
        return {
            canStart: false,
            errorMessage: `Уже идёт исследование: ${activeTech.name}`,
            messageType: "warning",
        };
    }

    // Проверка предварительных требований
    for (const prereq of tech.prerequisites) {
        if (!state.research.researchedTechs.includes(prereq)) {
            const prereqTech = RESEARCH_TREE[prereq];
            return {
                canStart: false,
                errorMessage: `Требуется технология: ${prereqTech.name}`,
                messageType: "error",
            };
        }
    }

    // Проверка ресурсов
    if (!hasRequiredResources(state, tech.resources)) {
        // Находим конкретный ресурс, которого не хватает
        for (const resourceType of typedKeys(tech.resources)) {
            const required = tech.resources[resourceType] ?? 0;
            const available = state.research.resources[resourceType] || 0;

            // Для rare_minerals проверяем ещё и торговые товары
            let totalAvailable = available;
            if (resourceType === "rare_minerals") {
                const tradeGood = state.ship.tradeGoods.find(
                    (tg) => tg.item === "rare_minerals",
                );
                if (tradeGood) {
                    totalAvailable += tradeGood.quantity;
                }
            }

            if (totalAvailable < required) {
                const resourceInfo = RESEARCH_RESOURCES[resourceType];
                return {
                    canStart: false,
                    errorMessage: `Недостаточно ресурса: ${resourceInfo.name} (нужно: ${required}, есть: ${totalAvailable})`,
                    messageType: "error",
                };
            }
        }
    }

    // Проверка кредитов
    if (state.credits < tech.credits) {
        return {
            canStart: false,
            errorMessage: "Недостаточно кредитов",
            messageType: "error",
        };
    }

    // Проверка наличия лаборатории и учёного
    if (!hasLabAndScientist(state)) {
        return {
            canStart: false,
            errorMessage: "Требуется лаборатория и учёный",
            messageType: "error",
        };
    }

    return { canStart: true };
};

/**
 * Запускает исследование технологии
 *
 * @param techId - ID технологии для исследования
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 */
export const startResearch = (
    techId: TechnologyId,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const tech = RESEARCH_TREE[techId];

    if (!tech) return;

    // Валидация
    const validation = validateResearchStart(state, techId);

    if (!validation.canStart && validation.errorMessage) {
        get().addLog(validation.errorMessage, validation.messageType);
        return;
    }

    // Списываем ресурсы и кредиты
    const { newResources, newTradeGoods } = deductResearchResources(
        state,
        tech.resources,
    );

    // Вычисляем производительность исследования
    const researchOutput = calculateResearchOutput(state);

    // Вычисляем начальное количество ходов
    const initialTurnsRemaining = calculateTurnsRemaining(
        0,
        tech.scienceCost,
        researchOutput.totalOutput,
    );

    // Обновляем состояние
    set({
        credits: state.credits - tech.credits,
        ship: {
            ...state.ship,
            tradeGoods: newTradeGoods,
        },
        research: {
            ...state.research,
            resources: newResources,
            activeResearch: {
                techId,
                progress: 0,
                turnsRemaining: initialTurnsRemaining,
            },
        },
    });

    // Логирование
    get().addLog(`🔬 Начато исследование: ${tech.name}`, "info");
    playSound("success");
};
