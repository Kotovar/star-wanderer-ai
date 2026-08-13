import { BASE_COST, BASE_MODULES } from "@/game/constants/baseModules";
import { planetHasFeature } from "@/game/planets";
import type { BaseModuleId } from "@/game/types/outposts";
import { OUTPOST_LIMITS, OUTPOST_TECH_ID } from "@/game/constants/outposts";
import type { GameState, Location } from "@/game/types";
import type { OutpostBuildBlocker } from "@/game/types/outposts";

type BuildState = Pick<GameState, "credits" | "outposts" | "research">;

/**
 * Почему базу нельзя заложить здесь и сейчас — или `null`, если можно.
 *
 * Право даёт полное исследование планеты: `explored` перестаёт быть
 * надгробием и становится разрешением строить, а четыре операции на
 * поверхности — изысканиями, а не чек-листом.
 */
export function getBaseBlocker(
    state: BuildState,
    location: Location | null | undefined,
): OutpostBuildBlocker | null {
    if (!location || location.type !== "planet" || !location.isEmpty) {
        return "wrong_location";
    }
    if (!state.research.researchedTechs.includes(OUTPOST_TECH_ID)) {
        return "tech_missing";
    }
    if (!location.explored) return "not_explored";
    if (location.preSpacefaringContact) {
        return "settlement_discovered";
    }
    if (state.outposts.some((outpost) => outpost.locationId === location.id)) {
        return "already_built";
    }
    if (state.outposts.some((outpost) => outpost.kind === "base")) {
        return "limit_reached";
    }
    if (state.credits < BASE_COST.credits) return "not_enough_credits";

    for (const [resource, amount] of Object.entries(BASE_COST.resources)) {
        const held =
            state.research.resources[
                resource as keyof typeof state.research.resources
            ] ?? 0;
        if (held < amount) return "not_enough_resources";
    }

    return null;
}

export const getBaseLimit = () => OUTPOST_LIMITS.base;

/**
 * Что эта планета даст базе: какие модули здесь возможны и какие удвоятся.
 *
 * Нужно до закладки: 6000₢ — слишком дорого, чтобы тратить их вслепую и
 * узнавать про непригодную планету уже после.
 */
export function getBasePotential(locationId: string): {
    available: BaseModuleId[];
    boosted: BaseModuleId[];
} {
    const ids = Object.keys(BASE_MODULES) as BaseModuleId[];
    return {
        available: ids.filter(
            (id) =>
                !BASE_MODULES[id].requiresFeature ||
                planetHasFeature(locationId, BASE_MODULES[id].requiresFeature),
        ),
        boosted: ids.filter(
            (id) =>
                BASE_MODULES[id].boostedBy &&
                planetHasFeature(locationId, BASE_MODULES[id].boostedBy),
        ),
    };
}
