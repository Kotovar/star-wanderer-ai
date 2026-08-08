import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";
import { getBunkerEntries } from "./accrueOutposts";

/**
 * Вывоз бункера. Работает только на месте: прилететь за добычей — и есть
 * та цена, ради которой у построек вообще появляется место на карте.
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

    const haul = getBunkerEntries(outpost);
    if (haul.length === 0) {
        get().addLog(i18nStore.t("game_logs.outpost_collect_empty"), "warning");
        return;
    }

    set((s) => ({
        gases: haul.reduce(
            (acc, [gas, amount]) => ({
                ...acc,
                [gas]: (acc[gas] ?? 0) + amount,
            }),
            { ...s.gases },
        ),
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? { ...o, bunker: {}, lastCollectedAtTurn: s.turn }
                : o,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.outpost_collected", {
            haul: haul
                .map(
                    ([gas, amount]) =>
                        `${i18nStore.t(`gases.${gas}.name`)} ×${amount}`,
                )
                .join(", "),
        }),
        "info",
    );
}
