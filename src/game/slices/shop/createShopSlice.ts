import type { GameStore, SetState, ShopItem } from "@/game/types";
import { buyUpgrade } from "./helpers/buyUpgrade";
import { buyModule } from "./helpers/buyModule";
import { buyWeapon } from "./helpers/buyWeapon";

/**
 * Интерфейс ShopSlice
 */
export interface ShopSlice {
    /**
     * Покупка товара на станции
     * @param item - Товар для покупки
     * @param targetModuleId - ID целевого модуля для улучшения (опционально)
     */
    buyItem: (item: ShopItem, targetModuleId?: number) => void;
}

/**
 * Создаёт shop слайс для обработки покупок на станциях
 */
export const createShopSlice = (
    set: SetState,
    get: () => GameStore,
): ShopSlice => ({
    buyItem: (item, targetModuleId) => {
        const state = get();

        // Проверка кредитов
        if (state.credits < item.price) {
            get().addLog("Недостаточно кредитов!", "error");
            return;
        }

        // Получение ID станции
        const stationId = state.currentLocation?.stationId;
        if (!stationId) {
            return;
        }

        // Получение инвентаря станции
        const inv = state.stationInventory[stationId] || {};
        const bought = inv[item.id] || 0;

        // Проверка-stock для товаров (не для улучшений)
        if (item.type !== "upgrade") {
            if (bought >= item.stock) {
                get().addLog("Товар распродан!", "error");
                return;
            }
        }

        // Обработка по типу товара
        if (item.type === "upgrade" && item.targetType) {
            buyUpgrade(set, get, item, targetModuleId);
        } else if (item.type === "module") {
            buyModule(set, get, item, stationId, inv, bought);
        } else if (item.type === "weapon") {
            buyWeapon(set, get, item, stationId, inv, bought);
        } else {
            get().addLog("Неизвестный тип товара!", "error");
            return;
        }

        get().updateShipStats();
    },
});
