import {
    GAS_BY_ATMOSPHERE,
    GAS_COLLECTOR_COST,
    OUTPOST_LIMITS,
    OUTPOST_TECH_ID,
} from "@/game/constants/outposts";
import type { GameState, Location } from "@/game/types";
import type { OutpostBuildBlocker } from "@/game/types/outposts";

type BuildState = Pick<GameState, "credits" | "outposts" | "research">;

/**
 * Почему сборщик нельзя поставить — или `null`, если можно.
 *
 * Чистая функция: панель показывает по ней причину отказа, действие ею же
 * проверяет себя, проверка гоняет её без стора. Иначе кнопка и действие
 * разъезжаются, и игрок жмёт активную кнопку, которая молча ничего не делает.
 */
export function getGasCollectorBlocker(
    state: BuildState,
    location: Location | null | undefined,
): OutpostBuildBlocker | null {
    if (!location || location.type !== "gas_giant") return "wrong_location";
    if (!location.gasGiantAtmosphere) return "wrong_location";
    if (!GAS_BY_ATMOSPHERE[location.gasGiantAtmosphere]) return "wrong_location";

    if (!state.research.researchedTechs.includes(OUTPOST_TECH_ID)) {
        return "tech_missing";
    }
    if (!location.gasGiantDeepDiveDone) return "no_deep_dive";
    if (state.outposts.some((outpost) => outpost.locationId === location.id)) {
        return "already_built";
    }

    const built = state.outposts.filter(
        (outpost) => outpost.kind === "gas_collector",
    ).length;
    if (built >= OUTPOST_LIMITS.gas_collector) return "limit_reached";

    if (state.credits < GAS_COLLECTOR_COST.credits) return "not_enough_credits";

    for (const [resource, amount] of Object.entries(
        GAS_COLLECTOR_COST.resources,
    )) {
        const held =
            state.research.resources[
                resource as keyof typeof state.research.resources
            ] ?? 0;
        if (held < amount) return "not_enough_resources";
    }

    return null;
}
