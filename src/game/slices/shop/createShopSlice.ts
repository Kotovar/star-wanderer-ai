import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState, ShopItem } from "@/game/types";
import { buyUpgrade } from "./helpers/buyUpgrade";
import { buyModule } from "./helpers/buyModule";
import { buyWeapon } from "./helpers/buyWeapon";
import { getFrontierSubsidyPrice } from "@/game/contracts/frontierContracts";

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

        // Получение ID станции
        const stationId = state.currentLocation?.stationId;
        if (!stationId) {
            return;
        }
        const effectiveItem = {
            ...item,
            price: getFrontierSubsidyPrice(state, item, stationId).price,
        };

        // Проверка кредитов
        if (state.credits < effectiveItem.price) {
            get().addLog( i18nStore.t("game_logs.createShopSlice_1"), "error");
            return;
        }

        // Получение инвентаря станции
        const inv = state.stationInventory[stationId] || {};
        const bought = inv[item.id] || 0;

        // Проверка-stock для товаров (не для улучшений)
        if (effectiveItem.type !== "upgrade") {
            if (bought >= effectiveItem.stock) {
                get().addLog( i18nStore.t("game_logs.createShopSlice_2"), "error");
                return;
            }
        }

        // Обработка по типу товара
        let purchased = false;
        if (effectiveItem.type === "upgrade" && effectiveItem.targetType) {
            buyUpgrade(set, get, effectiveItem, targetModuleId);
        } else if (effectiveItem.type === "module") {
            purchased = buyModule(set, get, effectiveItem, stationId, inv, bought);
        } else if (effectiveItem.type === "weapon") {
            purchased = buyWeapon(set, get, effectiveItem, stationId, inv, bought);
        } else {
            get().addLog( i18nStore.t("game_logs.createShopSlice_3"), "error");
            return;
        }

        if (purchased && state.frontierSubsidy?.targetStationId === stationId) {
            set((s) => ({
                frontierSubsidy: s.frontierSubsidy && {
                    ...s.frontierSubsidy,
                    ...(effectiveItem.type === "module" && effectiveItem.moduleType === "weaponbay"
                        ? { weaponBayAvailable: false }
                        : effectiveItem.type === "weapon"
                          ? { weaponAvailable: false }
                          : {}),
                },
            }));
        }

        get().updateShipStats();
    },
});
