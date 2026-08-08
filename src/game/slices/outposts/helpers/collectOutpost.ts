import { store as i18nStore } from "@/lib/useTranslation";
import { getFreeCargoSpace } from "@/game/slices/ship/helpers/getCargoCapacity";
import type { GameStore, SetState } from "@/game/types";
import type { GasType, OutpostResource } from "@/game/types/outposts";
import type { Goods } from "@/game/types";
import { getHaulKind, takesCargoRoom } from "./routeHaul";
import { describeHaulResource } from "./describeHaul";
import { getBunkerEntries } from "./accrueOutposts";

/**
 * Вывоз бункера. Работает только на месте: прилететь за добычей — и есть
 * та цена, ради которой у построек вообще появляется место на карте.
 *
 * Газ занимает трюм, поэтому берём столько, сколько влезает, а остаток
 * оставляем в бункере. Полный бункер при этом продолжает простаивать —
 * то есть маленький трюм превращает «слетать за газом» в несколько рейсов,
 * а не в одну бесплатную кнопку.
 */
export function collectOutpost(
    outpostId: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost) return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.outpost_collect_remote"), "error");
        return;
    }

    const stored = getBunkerEntries(outpost);
    if (stored.length === 0) {
        get().addLog(i18nStore.t("game_logs.outpost_collect_empty"), "warning");
        return;
    }

    let room = getFreeCargoSpace(state);
    const needsRoom = stored.some(([resource]) => takesCargoRoom(resource));
    if (needsRoom && room <= 0) {
        get().addLog(i18nStore.t("game_logs.outpost_collect_no_room"), "warning");
        return;
    }

    // Научные образцы трюма не занимают — так устроены все прочие источники
    const taken: [OutpostResource, number][] = [];
    const left: Partial<Record<OutpostResource, number>> = {};
    for (const [resource, amount] of stored) {
        if (!takesCargoRoom(resource)) {
            taken.push([resource, amount]);
            continue;
        }
        const fits = Math.min(amount, room);
        if (fits > 0) taken.push([resource, fits]);
        if (amount > fits) left[resource] = amount - fits;
        room -= fits;
    }

    const leftover = Object.values(left).reduce<number>(
        (sum, amount) => sum + (amount ?? 0),
        0,
    );

    set((s) => ({
        gases: taken.reduce((acc, [resource, amount]) => {
            if (getHaulKind(resource) !== "gas") return acc;
            const gas = resource as GasType;
            return { ...acc, [gas]: (acc[gas] ?? 0) + amount };
        }, { ...s.gases }),
        ship: {
            ...s.ship,
            tradeGoods: taken.reduce((goods, [resource, amount]) => {
                if (getHaulKind(resource) !== "good") return goods;
                const existing = goods.find((g) => g.item === resource);
                return existing
                    ? goods.map((g) =>
                          g.item === resource
                              ? { ...g, quantity: g.quantity + amount }
                              : g,
                      )
                    : [
                          ...goods,
                          {
                              item: resource as Goods,
                              quantity: amount,
                              buyPrice: 0,
                          },
                      ];
            }, s.ship.tradeGoods),
        },
        research: {
            ...s.research,
            resources: taken.reduce((acc, [resource, amount]) => {
                if (getHaulKind(resource) !== "research") return acc;
                const key = resource as keyof typeof acc;
                return { ...acc, [key]: (acc[key] ?? 0) + amount };
            }, { ...s.research.resources }),
        },
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? { ...o, bunker: left, lastCollectedAtTurn: s.turn }
                : o,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.outpost_collected", {
            haul: taken
                .map(
                    ([resource, amount]) =>
                        `${describeHaulResource(resource, i18nStore.t.bind(i18nStore))} ×${amount}`,
                )
                .join(", "),
        }),
        "info",
    );

    if (leftover > 0) {
        get().addLog(
            i18nStore.t("game_logs.outpost_collect_partial", { left: leftover }),
            "warning",
        );
    }
}
