import { RESEARCH_RESOURCES } from "@/game/constants";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getMiningResources } from "@/game/research/utils";
import { playSound } from "@/sounds";
import type { GameState, GameStore } from "@/game/types";

// Тип для set с поддержкой immer (позволяет и мутации, и объекты)
type SetState = {
    (
        partial:
            | Partial<GameState>
            | ((state: GameState) => Partial<GameState>),
    ): void;
};

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
    const asteroidTier = loc.asteroidTier || 1;

    // Проверка уровня бура
    if (drillLevel < asteroidTier) {
        get().addLog(
            `Нужен бур уровня ${asteroidTier}! У вас: уровень ${drillLevel}`,
            "error",
        );
        playSound("error");
        return;
    }

    // Расчёт ресурсов
    const resources = loc.resources || {
        minerals: 0,
        rare: 0,
        credits: 0,
    };

    const efficiencyBonus = calculateEfficiencyBonus(
        drillLevel,
        asteroidTier,
        state,
    );

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
            tradeGoods: [
                ...s.ship.tradeGoods,
                ...(addedMinerals > 0
                    ? [
                          {
                              item: "minerals" as const,
                              quantity: addedMinerals,
                              buyPrice: 0,
                          },
                      ]
                    : []),
                ...(addedRare > 0
                    ? [
                          {
                              item: "rare_minerals" as const,
                              quantity: addedRare,
                              buyPrice: 0,
                          },
                      ]
                    : []),
            ],
        },
        research: {
            ...s.research,
            resources: addResearchResources(
                s.research.resources,
                researchResources,
            ),
        },
    }));

    // Логирование исследовательских ресурсов
    researchResources.forEach((res) => {
        if (res.quantity > 0) {
            get().addLog(
                `💎 Получены исследовательские ресурсы: ${RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].icon} ${RESEARCH_RESOURCES[res.type as keyof typeof RESEARCH_RESOURCES].name} x${res.quantity}`,
                "info",
            );
        }
    });

    // Пояс разработан
    set((s) => ({
        currentLocation: s.currentLocation
            ? { ...s.currentLocation, mined: true }
            : null,
        completedLocations: [...s.completedLocations, loc.id],
    }));

    playSound("shop");

    // Логирование результатов
    get().addLog(`Кредиты: +${creditsGained}₢`, "info");
    if (rareGained > 0) get().addLog(`Редкие минералы: +${rareGained}`, "info");
    get().addLog(`Минералы: +${mineralsGained}`, "info");

    // Опыт инженеру
    const engineer = state.crew.find((c) => c.profession === "engineer");
    if (engineer) {
        get().gainExp(engineer, 15 * asteroidTier);
    }

    get().nextTurn();
};

/**
 * Рассчитывает бонус эффективности добычи
 * @param drillLevel - Уровень бура
 * @param asteroidTier - Тир астероида
 * @param state - Текущее состояние игры
 * @returns Множитель эффективности
 */
const calculateEfficiencyBonus = (
    drillLevel: number,
    asteroidTier: number,
    state: GameState,
): number => {
    let efficiencyBonus = 1;

    // Бонус древнего бура (уровень 4)
    if (drillLevel === 4 && asteroidTier < 4) {
        const ancientBonus = [0.7, 0.5, 0.3, 0][asteroidTier - 1];
        efficiencyBonus = 1 + ancientBonus;
    }
    // Бонус за разницу уровней
    else if (drillLevel > asteroidTier) {
        efficiencyBonus = 1 + (drillLevel - asteroidTier) * 0.2;
    }

    // Бонус от сращивания ксеноморфа с drill
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.resourceYield) {
        efficiencyBonus *= 1 + mergeBonus.resourceYield / 100;
    }

    return efficiencyBonus;
};

/**
 * Распределяет ресурсы по грузовому отсеку
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
): { addedMinerals: number; addedRare: number } => {
    const currentCargo = state.ship.tradeGoods.reduce(
        (sum, tg) => sum + tg.quantity,
        0,
    );
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

    // Частичное размещение с приоритетом минералов
    const scale = cargoSpaceLeft / totalNeeded;
    const addedMinerals = Math.max(1, Math.floor(mineralsGained * scale));
    let addedRare = Math.max(1, Math.floor(rareGained * scale));

    // Корректировка если не влезает
    if (addedMinerals + addedRare > cargoSpaceLeft) {
        addedRare = Math.max(0, cargoSpaceLeft - addedMinerals);
    }

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
