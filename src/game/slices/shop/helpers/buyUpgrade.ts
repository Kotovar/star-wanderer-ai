import type {
    GameState,
    GameStore,
    Module,
    SetState,
    ShopItem,
} from "@/game/types";
import { playSound } from "@/sounds";
import { MODULES_BY_LEVEL } from "@/game/components/station";
import {
    MAX_UPGRADE_LEVEL,
    MODULE_HEALTH_BY_LEVEL,
    UPGRADE_HEALTH_BONUS,
} from "../constants";

/**
 * Результат проверки возможности улучшения
 */
interface UpgradeValidation {
    /** Можно ли улучшить */
    canUpgrade: boolean;
    /** Сообщение об ошибке, если нельзя улучшить */
    error?: string;
    /** Модуль для улучшения, если найден */
    module?: Module;
}

/**
 * Проверяет возможность улучшения модуля
 * @param item - Товар для покупки
 * @param targetModuleId - Целевой ID модуля (опционально)
 * @param state - Текущее состояние игры
 * @param get - Функция получения состояния
 * @returns Результат проверки
 */
const validateUpgrade = (
    item: ShopItem,
    targetModuleId: number | undefined,
    state: GameState,
): UpgradeValidation => {
    if (!item.targetType) {
        return {
            canUpgrade: false,
            error: "Не указан тип модуля для улучшения",
        };
    }

    // Поиск модуля для улучшения
    let tgt: Module | undefined;
    if (targetModuleId !== undefined) {
        tgt = state.ship.modules.find(
            (m) => m.id === targetModuleId && m.type === item.targetType,
        );
    } else {
        tgt = state.ship.modules.find((m) => m.type === item.targetType);
    }

    if (!tgt) {
        return { canUpgrade: false, error: `Нет модуля ${item.targetType}!` };
    }

    // Проверка максимального уровня
    const currentLevel = tgt.level || 1;
    if (currentLevel >= MAX_UPGRADE_LEVEL) {
        return {
            canUpgrade: false,
            error: "Максимальный уровень улучшения! (LV3)",
            module: tgt,
        };
    }

    return { canUpgrade: true, module: tgt };
};

/**
 * Улучшает модуль двигателя (особая логика - только эффективность топлива)
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param module - Модуль для улучшения
 * @param item - Товар для покупки
 * @param nextLevel - Следующий уровень
 */
const upgradeEngine = (
    set: SetState,
    get: () => GameStore,
    module: Module,
    item: ShopItem,
    nextLevel: number,
): void => {
    const fuelEfficiencyImprovement = item.effect?.fuelEfficiency || 0;

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.id === module.id
                    ? {
                          ...m,
                          fuelEfficiency: Math.max(
                              1,
                              (m.fuelEfficiency || 10) +
                                  fuelEfficiencyImprovement,
                          ),
                          level: nextLevel,
                          defense: nextLevel,
                          maxHealth:
                              (m.maxHealth || 100) + UPGRADE_HEALTH_BONUS,
                          health: (m.health || 100) + UPGRADE_HEALTH_BONUS,
                      }
                    : m,
            ),
        },
        credits: s.credits - item.price,
    }));

    const updatedModule = get().ship.modules.find((m) => m.id === module.id);
    get().addLog(
        `Модуль "${updatedModule?.name}" улучшен до LV${updatedModule?.level}`,
        "info",
    );
    get().updateShipStats();
    playSound("success");
};

/**
 * Проверяет, можно ли разместить модуль с новыми размерами на корабле
 * @param module - Модуль для улучшения
 * @param newWidth - Новая ширина
 * @param newHeight - Новая высота
 * @param state - Текущее состояние игры
 * @param canPlaceModule - Функция проверки возможности размещения
 * @returns true если место есть
 */
const hasSpaceForUpgrade = (
    module: Module,
    newWidth: number,
    newHeight: number,
    state: GameState,
    canPlaceModule: (mod: Module, x: number, y: number) => boolean,
): boolean => {
    // Если размеры не изменились или уменьшились - место есть
    if (newWidth <= module.width && newHeight <= module.height) {
        return true;
    }

    // Создаём временный модуль с новыми размерами для проверки
    const tempModule: Module = {
        ...module,
        width: newWidth,
        height: newHeight,
    };

    // Проверяем, можно ли разместить модуль с новыми размерами на текущей позиции
    if (canPlaceModule(tempModule, module.x, module.y)) {
        return true;
    }

    // Если на текущей позиции нельзя, ищем другое место
    const gridSize = state.ship.gridSize;
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (canPlaceModule(tempModule, x, y)) {
                return true;
            }
        }
    }

    return false;
};

/**
 * Улучшает модуль по шаблону из MODULES_BY_LEVEL
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param module - Модуль для улучшения
 * @param item - Товар для покупки
 * @param nextLevel - Следующий уровень
 */
const upgradeModule = (
    set: SetState,
    get: () => GameStore,
    module: Module,
    item: ShopItem,
    nextLevel: number,
): void => {
    const targetModuleTemplate = (MODULES_BY_LEVEL[nextLevel] || []).find(
        (m) => m.moduleType === item.targetType,
    );

    if (!targetModuleTemplate) {
        get().addLog(`Нет модуля ${nextLevel} уровня для улучшения!`, "error");
        return;
    }

    const newWidth = targetModuleTemplate.width || module.width;
    const newHeight = targetModuleTemplate.height || module.height;

    // Проверка места на корабле
    const state = get();
    if (
        !hasSpaceForUpgrade(
            module,
            newWidth,
            newHeight,
            state,
            state.canPlaceModule,
        )
    ) {
        get().addLog(
            `⚠ Недостаточно места для улучшения! Модуль станет ${newWidth}x${newHeight}, но на корабле нет подходящего места.`,
            "error",
        );
        return;
    }

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.id === module.id
                    ? {
                          ...m,
                          name: targetModuleTemplate.name,
                          width: newWidth,
                          height: newHeight,
                          consumption: targetModuleTemplate.consumption || 0,
                          power: targetModuleTemplate.power,
                          capacity: targetModuleTemplate.capacity,
                          oxygen: targetModuleTemplate.oxygen,
                          scanRange: targetModuleTemplate.scanRange,
                          fuelEfficiency: targetModuleTemplate.fuelEfficiency,
                          ...(targetModuleTemplate.researchOutput && {
                              researchOutput:
                                  targetModuleTemplate.researchOutput,
                          }),
                          ...(targetModuleTemplate.healing && {
                              healing: targetModuleTemplate.healing,
                          }),
                          ...(targetModuleTemplate.shields && {
                              shields: targetModuleTemplate.shields,
                          }),
                          x: m.x,
                          y: m.y,
                          level: nextLevel,
                          defense: nextLevel,
                          maxHealth: MODULE_HEALTH_BY_LEVEL[nextLevel] || 100,
                          health: MODULE_HEALTH_BY_LEVEL[nextLevel] || 100,
                      }
                    : m,
            ),
        },
    }));

    set((s) => ({
        credits: s.credits - item.price,
    }));

    const updatedModule = get().ship.modules.find((m) => m.id === module.id);
    get().addLog(
        `Модуль "${updatedModule?.name}" улучшен до LV${updatedModule?.level}`,
        "info",
    );
    get().updateShipStats();
    playSound("success");
};

/**
 * Покупка улучшения модуля
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param item - Товар для покупки
 * @param targetModuleId - Целевой ID модуля (опционально)
 */
export const buyUpgrade = (
    set: SetState,
    get: () => GameStore,
    item: ShopItem,
    targetModuleId?: number,
): void => {
    const state = get();

    const validation = validateUpgrade(item, targetModuleId, state);

    if (!validation.canUpgrade) {
        if (validation.error) {
            get().addLog(validation.error, "error");
            if (validation.module) {
                get().addLog(
                    "Модули LV4 можно только найти в секторах тир 3 или у боссов.",
                    "warning",
                );
            }
        }
        return;
    }

    const moduleShip = validation.module;
    const nextLevel = (moduleShip?.level || 1) + 1;

    // Особая логика для двигателей
    if (item.targetType === "engine" && moduleShip) {
        upgradeEngine(set, get, moduleShip, item, nextLevel);
        return;
    }

    // Стандартное улучшение
    if (moduleShip) {
        upgradeModule(set, get, moduleShip, item, nextLevel);
    }
};
