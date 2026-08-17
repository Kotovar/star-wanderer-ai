import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, Goods, SetState } from "@/game/types";
import type { GasType, OutpostResource } from "@/game/types/outposts";
import { hasBaseService } from "./baseServices";
import { getStorageFree } from "./baseStorage";
import { describeHaulResource } from "./describeHaul";
import { getHaulKind, takesCargoRoom } from "./routeHaul";
import { getFreeCargoSpace } from "@/game/slices/ship/helpers/getCargoCapacity";

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
    if (!Number.isFinite(quantity)) return;

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
                      storedGoods: {
                          ...o.storedGoods,
                          [resource]: (o.storedGoods?.[resource] ?? 0) + amount,
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

/**
 * Забрать товар или газ со склада обратно в трюм.
 *
 * Зеркало `storeAtBase`, а не ветка «забрать добычу»: бункер вывозят целиком
 * одной кнопкой, а со склада берут ровно столько, сколько нужно и влезает.
 */
export function withdrawFromBase(
    outpostId: string,
    resource: OutpostResource,
    quantity: number,
    set: SetState,
    get: () => GameStore,
): void {
    if (!Number.isFinite(quantity)) return;

    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost) return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.base_service_remote"), "error");
        return;
    }

    const kind = getHaulKind(resource);
    const held = outpost.storedGoods?.[resource] ?? 0;
    // Научные образцы трюма не занимают — как и при вывозе бункера
    const room = takesCargoRoom(resource)
        ? getFreeCargoSpace(state)
        : Number.MAX_SAFE_INTEGER;
    const amount = Math.min(held, Math.max(0, Math.floor(quantity)), room);
    if (amount <= 0) {
        get().addLog(i18nStore.t("game_logs.outpost_collect_no_room"), "warning");
        return;
    }

    set((s) => ({
        gases:
            kind === "gas"
                ? {
                      ...s.gases,
                      [resource as GasType]:
                          (s.gases[resource as GasType] ?? 0) + amount,
                  }
                : s.gases,
        research:
            kind === "research"
                ? {
                      ...s.research,
                      resources: {
                          ...s.research.resources,
                          [resource]:
                              (s.research.resources[
                                  resource as keyof typeof s.research.resources
                              ] ?? 0) + amount,
                      },
                  }
                : s.research,
        ship:
            kind === "good"
                ? {
                      ...s.ship,
                      tradeGoods: s.ship.tradeGoods.some(
                          (g) => g.item === resource,
                      )
                          ? s.ship.tradeGoods.map((g) =>
                                g.item === resource
                                    ? { ...g, quantity: g.quantity + amount }
                                    : g,
                            )
                          : [
                                ...s.ship.tradeGoods,
                                {
                                    item: resource as Goods,
                                    quantity: amount,
                                    buyPrice: 0,
                                },
                            ],
                  }
                : s.ship,
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? {
                      ...o,
                      storedGoods: {
                          ...o.storedGoods,
                          [resource]: (o.storedGoods?.[resource] ?? 0) - amount,
                      },
                  }
                : o,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.base_withdrawn", {
            resource: describeHaulResource(
                resource,
                i18nStore.t.bind(i18nStore),
            ),
            qty: amount,
        }),
        "info",
    );
    get().updateShipStats();
}
