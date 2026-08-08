import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, Goods, SetState } from "@/game/types";
import type { GasType } from "@/game/types/outposts";

/**
 * Что именно выбрасываем. Один тип на все шесть групп трюма: содержимое
 * `ship.cargo` (задания, собранное оружие, модули) адресуется индексом,
 * остальное — своим ключом.
 */
export type JettisonTarget =
    | { kind: "cargo"; index: number }
    | { kind: "trade_good"; good: Goods }
    | { kind: "gas"; gas: GasType }
    | { kind: "probes" };

/** Сколько этого добра на борту — нужно и диалогу, и самому действию */
export function getJettisonMax(
    state: GameStore,
    target: JettisonTarget,
): number {
    switch (target.kind) {
        case "cargo":
            return state.ship.cargo[target.index]?.quantity ?? 0;
        case "trade_good":
            return (
                state.ship.tradeGoods.find((g) => g.item === target.good)
                    ?.quantity ?? 0
            );
        case "gas":
            return state.gases?.[target.gas] ?? 0;
        case "probes":
            return state.probes;
    }
}

/**
 * Выброс за борт. Необратимо и без возмещения — это аварийный клапан, а не
 * способ торговать. Существует прежде всего ради криогена: он не продаётся
 * и тратится по единице за ход, так что полный трюм без выброса был бы
 * тупиком на десятки ходов.
 */
export function jettisonCargo(
    target: JettisonTarget,
    quantity: number,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const max = getJettisonMax(state, target);
    const amount = Math.min(max, Math.max(0, Math.floor(quantity)));
    if (amount <= 0) return;

    let name = "";

    switch (target.kind) {
        case "cargo": {
            const item = state.ship.cargo[target.index];
            if (!item) return;
            name = item.isCraftedWeapon && item.weaponType
                ? i18nStore.t(`weapon_types.${item.weaponType}`)
                : item.isModule
                  ? (item.module?.name ?? item.item)
                  : i18nStore.t(`cargo_items.${item.item}`, {
                        defaultValue: item.item,
                    });
            set((s) => ({
                ship: {
                    ...s.ship,
                    cargo: s.ship.cargo.flatMap((c, i) =>
                        i !== target.index
                            ? [c]
                            : c.quantity > amount
                              ? [{ ...c, quantity: c.quantity - amount }]
                              : [],
                    ),
                },
            }));
            break;
        }

        case "trade_good": {
            name = i18nStore.t(`trade.goods.${target.good}`);
            set((s) => ({
                ship: {
                    ...s.ship,
                    tradeGoods: s.ship.tradeGoods.flatMap((g) =>
                        g.item !== target.good
                            ? [g]
                            : g.quantity > amount
                              ? [{ ...g, quantity: g.quantity - amount }]
                              : [],
                    ),
                },
            }));
            break;
        }

        case "gas": {
            name = i18nStore.t(`gases.${target.gas}.name`);
            set((s) => {
                const gases = { ...s.gases };
                const left = (gases[target.gas] ?? 0) - amount;
                if (left > 0) gases[target.gas] = left;
                else delete gases[target.gas];
                return { gases };
            });
            break;
        }

        case "probes": {
            name = i18nStore.t("cargo.section_probes");
            set((s) => ({ probes: Math.max(0, s.probes - amount) }));
            break;
        }
    }

    get().addLog(
        i18nStore.t("game_logs.cargo_jettisoned", { name, qty: amount }),
        "warning",
    );
    get().updateShipStats();
}
