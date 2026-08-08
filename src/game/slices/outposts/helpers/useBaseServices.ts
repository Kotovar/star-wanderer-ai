import { store as i18nStore } from "@/lib/useTranslation";
import { BASE_SERVICE_VALUES } from "@/game/constants/baseModules";
import { shiftHappiness } from "@/game/crew";
import type { GameStore, SetState } from "@/game/types";
import { hasBaseService } from "./baseServices";


/**
 * Списывает груз, которым платят за услугу базы. Возвращает `false`, если не
 * хватило: услуга бесплатна в кредитах, но не в материалах.
 */
function takeSupplies(
    cost: { item: string; quantity: number },
    set: SetState,
    get: () => GameStore,
): boolean {
    const held =
        get().ship.tradeGoods.find((g) => g.item === cost.item)?.quantity ?? 0;
    if (held < cost.quantity) {
        get().addLog(
            i18nStore.t("game_logs.base_service_no_supplies", {
                item: i18nStore.t(`trade.goods.${cost.item}`),
                qty: cost.quantity,
            }),
            "error",
        );
        return false;
    }
    set((s) => ({
        ship: {
            ...s.ship,
            tradeGoods: s.ship.tradeGoods.flatMap((g) =>
                g.item !== cost.item
                    ? [g]
                    : g.quantity > cost.quantity
                      ? [{ ...g, quantity: g.quantity - cost.quantity }]
                      : [],
            ),
        },
    }));
    return true;
}

/**
 * Ремдок: чинит модули корабля прямо на базе.
 *
 * Ради этого базу и строят в глубоких секторах, где дружественных станций
 * нет. Стоит ход и работает только на месте — иначе это была бы кнопка
 * «починиться» из любой точки галактики.
 */
export function repairAtBase(
    outpostId: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost || !hasBaseService(outpost, "repair")) return;
    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.base_service_remote"), "error");
        return;
    }

    const damaged = state.ship.modules.filter((m) => m.health < m.maxHealth);
    if (damaged.length === 0) {
        get().addLog(i18nStore.t("game_logs.base_repair_nothing"), "warning");
        return;
    }
    if (!takeSupplies(BASE_SERVICE_VALUES.repairCost, set, get)) return;

    set((s) => ({
        turn: s.turn + 1,
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.health < m.maxHealth
                    ? {
                          ...m,
                          health: Math.min(
                              m.maxHealth,
                              m.health + BASE_SERVICE_VALUES.repairAmount,
                          ),
                      }
                    : m,
            ),
        },
    }));

    get().addLog(
        i18nStore.t("game_logs.base_repaired", { count: damaged.length }),
        "info",
    );
    get().updateShipStats();
}

/**
 * Медблок: лечит экипаж и снимает усталость от назначений.
 *
 * Усталость снимается вместе со здоровьем намеренно — иначе медблок был бы
 * бледной копией корабельного медотсека, который лечит и так.
 */
export function healAtBase(
    outpostId: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost || !hasBaseService(outpost, "heal")) return;
    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.base_service_remote"), "error");
        return;
    }

    const needsCare = state.crew.some(
        (c) => c.health < c.maxHealth || (c.assignmentFatigue ?? 0) > 0,
    );
    if (!needsCare) {
        get().addLog(i18nStore.t("game_logs.base_heal_nothing"), "warning");
        return;
    }
    if (!takeSupplies(BASE_SERVICE_VALUES.healCost, set, get)) return;

    set((s) => ({
        turn: s.turn + 1,
        crew: s.crew.map((c) =>
            shiftHappiness(
                {
                    ...c,
                    health: Math.min(
                        c.maxHealth,
                        c.health + BASE_SERVICE_VALUES.healAmount,
                    ),
                    assignmentFatigue: 0,
                    assignmentRestTurns: 0,
                },
                2,
            ),
        ),
    }));

    get().addLog(i18nStore.t("game_logs.base_healed"), "info");
}
