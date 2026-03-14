import type { SetState, GameStore, ModuleType } from "@/game/types";
import { MODULES_BY_LEVEL } from "@/game/components/station/station-data";
import { MODULES_FROM_BOSSES } from "@/game/constants/modules";

/**
 * Получает базовую цену модуля по его типу и уровню
 * Для обычных модулей (1-3 уровень) - цена из магазина соответствующего тира
 * Для модулей 4 тира (из боссов) - специальная цена
 *
 * @param moduleType - Тип модуля
 * @param moduleLevel - Уровень модуля
 * @returns Базовая цена модуля
 */
const getModuleBasePrice = (
    moduleType: ModuleType,
    moduleLevel: number,
): number => {
    // Модули 4 тира (нельзя купить в магазине)
    if (moduleLevel === 4) {
        const bossModule = MODULES_FROM_BOSSES.find(
            (m) => m.moduleType === moduleType && m.level === 4,
        );
        if (bossModule) {
            // Для модулей 4 тира используем их цену из списка боссов
            return bossModule.price || 1000;
        }
    }

    // Обычные модули (1-3 уровень) - берём цену из соответствующего тира
    // Уровень 1-2 → тир 1, Уровень 3 → тир 2, Уровень 4+ → тир 3
    const tierIndex = Math.min(moduleLevel, 3);
    const tierModules =
        MODULES_BY_LEVEL[tierIndex] || MODULES_BY_LEVEL[1] || [];
    const shopItem = tierModules.find((m) => m.moduleType === moduleType);

    // Если не нашли в тире, пробуем найти в тире 1
    if (!shopItem) {
        const tier1Modules = MODULES_BY_LEVEL[1] || [];
        const fallbackItem = tier1Modules.find(
            (m) => m.moduleType === moduleType,
        );
        return Math.min(fallbackItem?.price || 300, 5000);
    }

    // Возвращаем цену или дефолтное значение
    const price = shopItem?.price || 300;

    // Защита от слишком высоких цен (на случай ошибок в данных)
    return Math.min(price, 5000);
};

/**
 * Уничтожает модуль корабля и возвращает деньги
 *
 * @param moduleId - ID модуля для уничтожения
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const scrapModule = (
    moduleId: number,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const mod = state.ship.modules.find((m) => m.id === moduleId);
    if (!mod) return;

    // Check if any crew member is in this module
    const crewInModule = state.crew.filter((c) => c.moduleId === moduleId);
    if (crewInModule.length > 0) {
        get().addLog(
            `Нельзя уничтожить модуль "${mod.name}" - в нём находится экипаж (${crewInModule.length} чел.)!`,
            "error",
        );
        return;
    }

    // Essential modules that must have at least 1
    const essentialTypes: ModuleType[] = [
        "cockpit",
        "reactor",
        "fueltank",
        "engine",
        "lifesupport",
    ];

    if (essentialTypes.includes(mod.type)) {
        // Count how many of this type exist (excluding disabled ones)
        const sameTypeCount = state.ship.modules.filter(
            (m) => m.type === mod.type && !m.disabled,
        ).length;

        if (sameTypeCount <= 1) {
            get().addLog(`Нельзя уничтожить последний ${mod.name}!`, "error");
            return;
        }
    }

    // Calculate scrap value (70% of module base price)
    // IMPORTANT: Use base price from shop data, NOT from module object
    const basePrice = getModuleBasePrice(mod.type, mod.level || 1);
    const scrapPercent = 0.7; // 70% от цены
    const scrapValue = Math.floor(basePrice * scrapPercent);

    // Remove the module
    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.filter((m) => m.id !== moduleId),
        },
        credits: s.credits + scrapValue,
    }));

    get().addLog(
        `♻️ Модуль "${mod.name}" уничтожен. Получено ${scrapValue}₢`,
        "warning",
    );
    get().updateShipStats();
};
