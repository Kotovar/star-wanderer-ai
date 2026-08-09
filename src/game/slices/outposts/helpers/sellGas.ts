import { store as i18nStore } from "@/lib/useTranslation";
import {
    GAS_BASE_PRICE,
    GAS_BUY_RATE,
    GAS_SELL_RATE,
} from "@/game/constants/outposts";
import { getFreeCargoSpace } from "@/game/slices/ship/helpers/getCargoCapacity";
import type { GameStore, SetState } from "@/game/types";
import type { GasType } from "@/game/types/outposts";

/**
 * Продажа газа станции. Криоген не продаётся вообще: он расходник для билда,
 * и превратить его в кредиты значило бы стереть разницу между четырьмя газами.
 */
export function sellGas(
    gas: GasType,
    quantity: number,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const price = Math.round(GAS_BASE_PRICE[gas] * GAS_SELL_RATE);
    if (price <= 0) {
        get().addLog(i18nStore.t("game_logs.gas_not_sellable"), "error");
        return;
    }

    const held = state.gases[gas] ?? 0;
    const sold = Math.min(held, Math.max(0, Math.floor(quantity)));
    if (sold <= 0) return;

    set((s) => ({
        credits: s.credits + price * sold,
        gases: { ...s.gases, [gas]: (s.gases[gas] ?? 0) - sold },
    }));

    get().addLog(
        i18nStore.t("game_logs.gas_sold", {
            gas: i18nStore.t(`gases.${gas}.name`),
            qty: sold,
            total: price * sold,
        }),
        "info",
    );
}

/**
 * Покупка газа на станции.
 *
 * Нужна ровно затем, чтобы гибридный модуль не оказался заперт за атмосферой
 * гиганта: полимеры требуются рецептом, а метановый гигант под сборщик
 * попадается не каждому. Курс намеренно хуже продажи — свой сборщик всё
 * равно выгоднее, станция лишь не даёт забегу упереться в тупик.
 */
export function buyGas(
    gas: GasType,
    quantity: number,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const price = Math.round(GAS_BASE_PRICE[gas] * GAS_BUY_RATE);
    if (price <= 0) return;

    const requested = Math.max(0, Math.floor(quantity));
    if (requested <= 0) return;

    const room = getFreeCargoSpace(state);
    if (room <= 0) {
        get().addLog(i18nStore.t("game_logs.err_no_space"), "error");
        return;
    }

    const bought = Math.min(
        requested,
        Math.floor(state.credits / price),
        room,
    );
    if (bought <= 0) {
        get().addLog(
            i18nStore.t("game_logs.outpost_blocked_not_enough_credits"),
            "error",
        );
        return;
    }

    set((s) => ({
        credits: s.credits - price * bought,
        gases: { ...s.gases, [gas]: (s.gases[gas] ?? 0) + bought },
    }));

    get().addLog(
        i18nStore.t("game_logs.gas_bought", {
            gas: i18nStore.t(`gases.${gas}.name`),
            qty: bought,
            total: price * bought,
        }),
        "info",
    );
}
