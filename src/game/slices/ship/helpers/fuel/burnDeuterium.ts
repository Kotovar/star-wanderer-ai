import { store as i18nStore } from "@/lib/useTranslation";
import { DEUTERIUM_FUEL_PER_UNIT } from "@/game/constants/outposts";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { playSound } from "@/sounds";
import type { GameState } from "@/game/types/game";
import type { LogEntry } from "@/game/types/logs";

/** Потолок бака с учётом сращивания — тот же расчёт, что и при заправке */
export const getEffectiveMaxFuel = (state: GameState): number => {
    const bonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    const max = state.ship.maxFuel || 0;
    return bonus.fuelCapacity
        ? Math.floor(max * (1 + bonus.fuelCapacity / 100))
        : max;
};

/** Сколько единиц дейтерия имеет смысл сжечь: больше в бак не влезет */
export const getDeuteriumBurnUnits = (state: GameState): number => {
    const room = getEffectiveMaxFuel(state) - (state.ship.fuel || 0);
    if (room <= 0) return 0;
    return Math.min(
        state.gases?.deuterium ?? 0,
        Math.ceil(room / DEUTERIUM_FUEL_PER_UNIT),
    );
};

/**
 * Перегон дейтерия в топливо.
 *
 * До этого дейтерий был просто дорогим товаром, хотя во всех описаниях
 * значился топливом. Заправка идёт прямо в полёте и без кредитов — в этом и
 * смысл: газовый гигант перестаёт быть только источником денег и становится
 * запасом хода, ради которого стоит держать сборщик на водородном гиганте.
 *
 * Остаток за края бака сгорает намеренно: единица дейтерия не делится, и
 * «долить полторы» превратило бы бак в дробный склад газа.
 */
export function burnDeuterium(
    state: GameState,
    units: number,
    addLog: (message: string, type?: LogEntry["type"]) => void,
    set: (fn: (s: GameState) => Partial<GameState>) => void,
): void {
    const burn = Math.min(
        Math.max(0, Math.floor(units)),
        getDeuteriumBurnUnits(state),
    );
    if (burn <= 0) {
        addLog(i18nStore.t("game_logs.deuterium_burn_pointless"), "warning");
        return;
    }

    const maxFuel = getEffectiveMaxFuel(state);
    const gained = Math.min(
        burn * DEUTERIUM_FUEL_PER_UNIT,
        maxFuel - (state.ship.fuel || 0),
    );

    set((s) => ({
        gases: { ...s.gases, deuterium: (s.gases?.deuterium ?? 0) - burn },
        ship: { ...s.ship, fuel: (s.ship.fuel || 0) + gained },
    }));
    addLog(
        i18nStore.t("game_logs.deuterium_burned", { units: burn, gained }),
        "info",
    );
    playSound("world_refuel");
}
