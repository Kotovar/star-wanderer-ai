import { store as i18nStore } from "@/lib/useTranslation";
import { BASE_SERVICE_VALUES } from "@/game/constants/baseModules";
import { getFreeCargoSpace } from "@/game/slices/ship/helpers/getCargoCapacity";
import type { CargoItem, GameStore, SetState } from "@/game/types";
import type { Outpost, OutpostResource } from "@/game/types/outposts";
import { hasBaseService } from "./baseServices";

/** Общий объём склада: добыча в бункере и оставленный игроком груз вместе */
export function getStorageUsed(outpost: Outpost): number {
    const bunker = Object.values(
        outpost.bunker as Partial<Record<OutpostResource, number>>,
    ).reduce<number>((sum, n) => sum + (n ?? 0), 0);
    const stored = (outpost.storedCargo ?? []).reduce(
        (sum, item) => sum + item.quantity,
        0,
    );
    const goods = Object.values(outpost.storedGoods ?? {}).reduce<number>(
        (sum, n) => sum + (n ?? 0),
        0,
    );
    return bunker + stored + goods;
}

export const getStorageFree = (outpost: Outpost): number =>
    Math.max(0, BASE_SERVICE_VALUES.storageCapacity - getStorageUsed(outpost));

/**
 * Один и тот же ли это груз. Сравниваем по тому, что делает предмет
 * различимым для игрока: задание, модуль и тип орудия. Иначе на складе
 * слипнутся ящики от разных контрактов.
 */
const sameCargo = (a: CargoItem, b: CargoItem) =>
    a.item === b.item &&
    a.contractId === b.contractId &&
    Boolean(a.isModule) === Boolean(b.isModule) &&
    a.moduleLevel === b.moduleLevel &&
    a.weaponType === b.weaponType;

const merge = (list: CargoItem[], item: CargoItem): CargoItem[] => {
    const at = list.findIndex((entry) => sameCargo(entry, item));
    return at >= 0
        ? list.map((entry, i) =>
              i === at
                  ? { ...entry, quantity: entry.quantity + item.quantity }
                  : entry,
          )
        : [...list, item];
};

const take = (list: CargoItem[], index: number, amount: number): CargoItem[] =>
    list.flatMap((entry, i) =>
        i !== index
            ? [entry]
            : entry.quantity > amount
              ? [{ ...entry, quantity: entry.quantity - amount }]
              : [],
    );

/**
 * Положить груз из трюма на склад базы.
 *
 * Ради этого склад и нужен: артефактный груз задания и запасной модуль
 * продавать нельзя, а трюм они занимают. Раньше принимались только товары
 * и газ, то есть ровно то, что и так можно продать.
 */
export function storeCargoAtBase(
    outpostId: string,
    cargoIndex: number,
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

    const item = state.ship.cargo[cargoIndex];
    if (!item) return;

    const amount = Math.min(
        item.quantity,
        Math.max(0, Math.floor(quantity)),
        getStorageFree(outpost),
    );
    if (amount <= 0) {
        get().addLog(i18nStore.t("game_logs.base_store_full"), "warning");
        return;
    }

    set((s) => ({
        ship: { ...s.ship, cargo: take(s.ship.cargo, cargoIndex, amount) },
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? {
                      ...o,
                      storedCargo: merge(o.storedCargo ?? [], {
                          ...item,
                          quantity: amount,
                      }),
                  }
                : o,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.base_stored", { resource: item.item, qty: amount }),
        "info",
    );
    get().updateShipStats();
}

/** Забрать груз со склада обратно в трюм — сколько влезет */
export function withdrawCargoFromBase(
    outpostId: string,
    storedIndex: number,
    quantity: number,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost) return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.base_service_remote"), "error");
        return;
    }

    const item = outpost.storedCargo?.[storedIndex];
    if (!item) return;

    const amount = Math.min(
        item.quantity,
        Math.max(0, Math.floor(quantity)),
        getFreeCargoSpace(state),
    );
    if (amount <= 0) {
        get().addLog(i18nStore.t("game_logs.outpost_collect_no_room"), "warning");
        return;
    }

    set((s) => ({
        ship: {
            ...s.ship,
            cargo: merge(s.ship.cargo, { ...item, quantity: amount }),
        },
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? {
                      ...o,
                      storedCargo: take(o.storedCargo ?? [], storedIndex, amount),
                  }
                : o,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.base_withdrawn", {
            resource: item.item,
            qty: amount,
        }),
        "info",
    );
    get().updateShipStats();
}
