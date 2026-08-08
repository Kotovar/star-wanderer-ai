import { store as i18nStore } from "@/lib/useTranslation";
import { getFreeCargoSpace } from "@/game/slices/ship/helpers/getCargoCapacity";
import type { GameStore, SetState } from "@/game/types";
import type { GasType } from "@/game/types/outposts";
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
    if (room <= 0) {
        get().addLog(i18nStore.t("game_logs.outpost_collect_no_room"), "warning");
        return;
    }

    const taken: [GasType, number][] = [];
    const left: Partial<Record<GasType, number>> = {};
    for (const [gas, amount] of stored) {
        const fits = Math.min(amount, room);
        if (fits > 0) taken.push([gas, fits]);
        if (amount > fits) left[gas] = amount - fits;
        room -= fits;
    }

    const leftover = Object.values(left).reduce<number>(
        (sum, amount) => sum + (amount ?? 0),
        0,
    );

    set((s) => ({
        gases: taken.reduce(
            (acc, [gas, amount]) => ({ ...acc, [gas]: (acc[gas] ?? 0) + amount }),
            { ...s.gases },
        ),
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
                    ([gas, amount]) =>
                        `${i18nStore.t(`gases.${gas}.name`)} ×${amount}`,
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
