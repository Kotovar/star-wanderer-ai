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
                          consumption: nextLevel, // lv2=2, lv3=3
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
    playSound("upgrade");
};

/**
 * Находит лучшую позицию для размещения модуля с новыми размерами.
 * Приоритет: текущая позиция (вправо/вниз) → влево → вверх → любое место на сетке.
 * @returns координаты {x, y} или null если места нет
 */
const findUpgradePosition = (
    module: Module,
    newWidth: number,
    newHeight: number,
    state: GameState,
    canPlaceModule: (mod: Module, x: number, y: number) => boolean,
): { x: number; y: number } | null => {
    // Если размеры не изменились или уменьшились — позиция не меняется
    if (newWidth <= module.width && newHeight <= module.height) {
        return { x: module.x, y: module.y };
    }

    const tempModule: Module = { ...module, width: newWidth, height: newHeight };

    // 1. Текущая позиция (расширение вправо/вниз)
    if (canPlaceModule(tempModule, module.x, module.y)) {
        return { x: module.x, y: module.y };
    }

    // 2. Расширение влево
    const deltaW = newWidth - module.width;
    if (deltaW > 0) {
        const leftX = module.x - deltaW;
        if (leftX >= 0 && canPlaceModule(tempModule, leftX, module.y)) {
            return { x: leftX, y: module.y };
        }
    }

    // 3. Расширение вверх
    const deltaH = newHeight - module.height;
    if (deltaH > 0) {
        const upY = module.y - deltaH;
        if (upY >= 0 && canPlaceModule(tempModule, module.x, upY)) {
            return { x: module.x, y: upY };
        }
    }

    // 4. Полный перебор сетки
    const gridSize = state.ship.gridSize;
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (canPlaceModule(tempModule, x, y)) {
                return { x, y };
            }
        }
    }

    return null;
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

    // Поиск места на корабле (с учётом расширения)
    const state = get();
    const newPos = findUpgradePosition(
        module,
        newWidth,
        newHeight,
        state,
        state.canPlaceModule,
    );

    if (!newPos) {
        get().addLog(
            `⚠ Недостаточно места для улучшения! Модуль станет ${newWidth}x${newHeight}, но на корабле нет подходящего места.`,
            "error",
        );
        return;
    }

    const moved = newPos.x !== module.x || newPos.y !== module.y;

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
                          ...(targetModuleTemplate.shieldRegen && {
                              shieldRegen: targetModuleTemplate.shieldRegen,
                          }),
                          ...(targetModuleTemplate.repairAmount !== undefined && {
                              repairAmount: targetModuleTemplate.repairAmount,
                          }),
                          ...(targetModuleTemplate.repairTargets !== undefined && {
                              repairTargets: targetModuleTemplate.repairTargets,
                          }),
                          x: newPos.x,
                          y: newPos.y,
                          ...(item.targetType === "weaponbay" &&
                              m.weapons !== undefined && {
                                  weapons: [
                                      ...m.weapons.slice(
                                          0,
                                          newWidth * newHeight,
                                      ),
                                      ...Array(
                                          Math.max(
                                              0,
                                              newWidth * newHeight -
                                                  m.weapons.length,
                                          ),
                                      ).fill(null),
                                  ],
                              }),
                          level: nextLevel,
                          defense: targetModuleTemplate.defense ?? nextLevel,
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
    if (moved) {
        get().addLog(
            `⚠ Модуль перемещён на позицию (${newPos.x}, ${newPos.y}) из-за увеличения размера`,
            "warning",
        );
    }
    get().updateShipStats();
    playSound("upgrade");
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
