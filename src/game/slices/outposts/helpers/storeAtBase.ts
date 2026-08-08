import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, Goods, SetState } from "@/game/types";
import type { GasType, OutpostResource } from "@/game/types/outposts";
import { hasBaseService } from "./baseServices";
import { getStorageFree } from "./baseStorage";
import { describeHaulResource } from "./describeHaul";
import { getHaulKind } from "./routeHaul";

/**
 * Разгрузка трюма на базу.
 *
 * Единственная услуга, работающая в обратную сторону: остальное база отдаёт,
 * а склад принимает. Смысл — освободить трюм под добычу, не продавая то, что
 * пригодится позже: артефактный груз заданий, редкие минералы под крафт.
 */
export function storeAtBase(
    outpostId: string,
    resource: OutpostResource,
    quantity: number,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost || !hasBaseService(outpost, "storage")) return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.base_service_remote"), "error");
        return;
    }

    const kind = getHaulKind(resource);
    const held =
        kind === "gas"
            ? (state.gases[resource as GasType] ?? 0)
            : (state.ship.tradeGoods.find((g) => g.item === resource)?.quantity ??
              0);

    const room = getStorageFree(outpost);
    const amount = Math.min(held, Math.max(0, Math.floor(quantity)), room);
    if (amount <= 0) {
        get().addLog(i18nStore.t("game_logs.base_store_full"), "warning");
        return;
    }

    set((s) => ({
        gases:
            kind === "gas"
                ? {
                      ...s.gases,
                      [resource as GasType]:
                          (s.gases[resource as GasType] ?? 0) - amount,
                  }
                : s.gases,
        ship:
            kind === "gas"
                ? s.ship
                : {
                      ...s.ship,
                      tradeGoods: s.ship.tradeGoods.flatMap((g) =>
                          g.item !== resource
                              ? [g]
                              : g.quantity > amount
                                ? [{ ...g, quantity: g.quantity - amount }]
                                : [],
                      ),
                  },
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? {
                      ...o,
                      bunker: {
                          ...o.bunker,
                          [resource]: (o.bunker[resource] ?? 0) + amount,
                      },
                  }
                : o,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.base_stored", {
            resource: describeHaulResource(
                resource,
                i18nStore.t.bind(i18nStore),
            ),
            qty: amount,
        }),
        "info",
    );
    get().updateShipStats();
    void (resource as Goods);
}
