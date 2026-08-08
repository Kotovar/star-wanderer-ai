import { store as i18nStore } from "@/lib/useTranslation";
import { RAID_GRACE_TURNS } from "@/game/constants/outpostRaids";
import type { GameStore, Location, SetState } from "@/game/types";

/**
 * Штурм захваченной постройки: обычный бой на месте.
 *
 * Победа возвращает постройку вместе с бункером — рейдеры держали добычу,
 * а не проедали её. Поэтому неудача стоит боя и времени, но не забега:
 * можно отступить, подлатать корабль и вернуться.
 */
export function assaultOutpost(
    outpostId: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost || outpost.capturedAtTurn === undefined) return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.outpost_assault_remote"), "error");
        return;
    }

    const raiders: Location = {
        ...(state.currentLocation as Location),
        id: `${outpost.id}-raiders`,
        type: "enemy",
        name: "locations.outpost_raiders",
        enemyType: "raider",
        threat: outpost.raiderThreat ?? 1,
    };

    // Кого именно отбиваем — понадобится при победе
    set(() => ({ assaultingOutpostId: outpostId }));
    get().addLog(i18nStore.t("game_logs.outpost_assault_started"), "warning");
    get().startCombat(raiders, false);
}

/**
 * Возврат постройки после победы. Зовётся из общей обработки победы, а не
 * из боя аванпоста: победить можно и отступив-вернувшись, и любым другим
 * путём, а восстановить постройку надо ровно один раз.
 */
export function resolveOutpostAssault(
    set: SetState,
    get: () => GameStore,
): void {
    const outpostId = get().assaultingOutpostId;
    if (!outpostId) return;

    set((s) => ({
        assaultingOutpostId: null,
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? {
                      ...o,
                      capturedAtTurn: undefined,
                      raiderThreat: undefined,
                      raidGraceUntil: s.turn + RAID_GRACE_TURNS,
                  }
                : o,
        ),
    }));

    get().addLog(i18nStore.t("game_logs.outpost_retaken"), "info");
}
