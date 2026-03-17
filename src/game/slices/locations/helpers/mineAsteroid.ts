import { ANCIENT_DRILL_BONUS, RESEARCH_RESOURCES } from "@/game/constants";
import { BASE_ENGINEER_EXP } from "@/game/constants/experience";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getMiningResources } from "@/game/research/utils";
import { playSound } from "@/sounds";
import { getCurrentCargo, addTradeGood } from "@/game/slices/ship/helpers";
import {
    ASTEROID_TIER,
    BONUS_BASE,
    DRILL_LEVEL_BONUS,
    PERCENT_DIVISOR,
    MIN_CARGO_QUANTITY,
} from "../constants";
import type { GameState, GameStore, SetState } from "@/game/types";

/** Результат распределения грузового пространства */
interface CargoAllocation {
    addedMinerals: number;
    addedRare: number;
}

// ============================================================================
// Вспомогательные функции
// ============================================================================

/**
 * Распределяет ресурсы по грузовому отсеку с приоритетом редких минералов
 * @param mineralsGained - Полученные минералы
 * @param rareGained - Полученные редкие минералы
 * @param state - Текущее состояние игры
 * @param get - Функция получения состояния
 * @returns Фактически добавленное количество ресурсов
 */
const allocateCargoSpace = (
    mineralsGained: number,
    rareGained: number,
    state: GameState,
    get: () => GameStore,
): CargoAllocation => {
    const currentCargo = getCurrentCargo(state);
    const cargoCapacity = get().getCargoCapacity();
    const cargoSpaceLeft = Math.max(0, cargoCapacity - currentCargo);

    const totalNeeded = mineralsGained + rareGained;

    // Нет места
    if (cargoSpaceLeft === 0) {
        get().addLog(
            "⚠️ Нет места в грузовом отсеке! Ресурсы потеряны.",
            "warning",
        );
        return { addedMinerals: 0, addedRare: 0 };
    }

    // Всё помещается
    if (totalNeeded <= cargoSpaceLeft) {
        return { addedMinerals: mineralsGained, addedRare: rareGained };
    }

    // Частичное размещение с приоритетом редких минералов
    const scale = cargoSpaceLeft / totalNeeded;
    const addedRare = Math.min(rareGained, Math.max(
        rareGained > 0 ? MIN_CARGO_QUANTITY : 0,
        Math.floor(rareGained * scale),
    ));
    // Минералы заполняют всё оставшееся место
    const addedMinerals = Math.min(mineralsGained, cargoSpaceLeft - addedRare);

    get().addLog(
        `⚠️ Недостаточно места! Получено: ${addedMinerals + addedRare} из ${totalNeeded}т`,
        "warning",
    );

    return { addedMinerals, addedRare };
};

/**
 * Добавляет исследовательские ресурсы в хранилище
 * @param currentResources - Текущие исследовательские ресурсы
 * @param researchResources - Ресурсы для добавления
 * @returns Обновлённые ресурсы
 */
const addResearchResources = (
    currentResources: Record<string, number>,
    researchResources: Array<{ type: string; quantity: number }>,
): Record<string, number> => {
    return researchResources.reduce(
        (acc, res) => ({
            ...acc,
            [res.type]:
                (currentResources[res.type as keyof typeof currentResources] ||
                    0) + res.quantity,
        }),
        { ...currentResources },
    );
};

// ============================================================================
// Основная функция
// ============================================================================

/**
 * Добыча ресурсов из пояса астероидов
 *
 * Механика:
 * - Требуется бур соответствующего уровня
 * - Эффективность зависит от разницы уровней бура и тира астероида
 * - Ресурсы занимают место в грузовом отсеке
 * - Инженер получает опыт
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const mineAsteroid = (set: SetState, get: () => GameStore): void => {
    const state = get();
    const loc = state.currentLocation;

    // Проверка: это пояс астероидов
    if (!loc || loc.type !== "asteroid_belt") {
        get().addLog("Это не пояс астероидов!", "error");
        return;
    }

    // Проверка: пояс уже разработан
    if (loc.mined) {
        get().addLog("Этот пояс уже разработан!", "warning");
        return;
    }

    const drillLevel = get().getDrillLevel();
    const asteroidTier = loc.asteroidTier || ASTEROID_TIER.BASIC;

    // Проверка уровня бура
    if (drillLevel < asteroidTier) {
        get().addLog(
            `Нужен бур уровня ${asteroidTier}! У вас: уровень ${drillLevel}`,
            "error",
        );
        playSound("error");
        return;
    }

    // Проверка наличия инженера
    const hasEngineer = state.crew.some((c) => c.profession === "engineer");
    if (!hasEngineer) {
        get().addLog("Для разработки астероидов нужен инженер на борту!", "error");
        playSound("error");
        return;
    }

    // Расчёт ресурсов
    const resources = loc.resources || {
        minerals: 0,
        rare: 0,
        credits: 0,
    };

    // Расчёт бонуса эффективности
    let efficiencyBonus = BONUS_BASE;

    // Бонус древнего бура (уровень 4)
    if (drillLevel === 4 && asteroidTier < 4) {
        efficiencyBonus += ANCIENT_DRILL_BONUS[asteroidTier - 1];
    }
    // Бонус за разницу уровней
    else if (drillLevel > asteroidTier) {
        efficiencyBonus += (drillLevel - asteroidTier) * DRILL_LEVEL_BONUS;
    }

    // Бонус от сращивания ксеноморфа с drill
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.resourceYield) {
        efficiencyBonus *= 1 + mergeBonus.resourceYield / PERCENT_DIVISOR;
    }

    const mineralsGained = Math.floor(resources.minerals * efficiencyBonus);
    const rareGained = Math.floor(resources.rare * efficiencyBonus);
    const creditsGained = Math.floor(resources.credits * efficiencyBonus);

    // Исследовательские ресурсы
    const researchResources = getMiningResources(drillLevel);

    // Расчёт места в грузовом отсеке
    const { addedMinerals, addedRare } = allocateCargoSpace(
        mineralsGained,
        rareGained,
        state,
        get,
    );

    // Обновление состояния
    set((s) => ({
        credits: s.credits + creditsGained,
        ship: {
            ...s.ship,
            tradeGoods: [addedMinerals, addedRare].reduce(
                (goods, qty, i) =>
                    qty > 0
                        ? addTradeGood(
                              goods,
                              i === 0 ? "minerals" : "rare_minerals",
                              qty,
                          )
                        : goods,
                s.ship.tradeGoods,
            ),
        },
        research: {
            ...s.research,
            resources: addResearchResources(
                s.research.resources,
                researchResources,
            ),
        },
    }));

    // Форматирование исследовательских ресурсов для результата и лога
    const researchLines: string[] = [];
    researchResources.forEach((res) => {
        if (res.quantity > 0) {
            const label = `${RESEARCH_RESOURCES[res.type].icon} ${RESEARCH_RESOURCES[res.type].name} x${res.quantity}`;
            researchLines.push(label);
            get().addLog(`💎 Получены исследовательские ресурсы: ${label}`, "info");
        }
    });

    // Предупреждение о грузе
    const totalGained = mineralsGained + rareGained;
    const totalAdded = addedMinerals + addedRare;
    let cargoWarning: string | undefined;
    if (totalAdded === 0 && totalGained > 0) {
        cargoWarning = "⚠️ Нет места в грузовом отсеке! Ресурсы потеряны.";
    } else if (totalAdded < totalGained) {
        cargoWarning = `⚠️ Недостаточно места! Получено: ${totalAdded} из ${totalGained}т`;
    }

    // Пояс разработан — сохраняем результаты в локации
    set((s) => ({
        currentLocation: s.currentLocation
            ? {
                  ...s.currentLocation,
                  mined: true,
                  miningResult: {
                      minerals: addedMinerals,
                      rare: addedRare,
                      credits: creditsGained,
                      researchResources: researchLines,
                      cargoWarning,
                  },
              }
            : null,
        completedLocations: [...s.completedLocations, loc.id],
    }));

    playSound("success");

    // Логирование результатов
    get().addLog(`Кредиты: +${creditsGained}₢`, "info");
    if (rareGained > 0) get().addLog(`Редкие минералы: +${rareGained}`, "info");
    get().addLog(`Минералы: +${mineralsGained}`, "info");

    // Опыт инженеру
    const engineer = state.crew.find((c) => c.profession === "engineer");
    if (engineer) {
        get().gainExp(engineer, BASE_ENGINEER_EXP * asteroidTier);
    }

    get().nextTurn();
};
