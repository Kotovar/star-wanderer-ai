import {
    PRE_SPACEFARING_CIVILIZATIONS,
    PRE_SPACEFARING_SETTLEMENT_ROLL_DIVISOR,
    PRE_SPACEFARING_SETTLEMENT_TILE_INDICES,
} from "@/game/constants";
import { hashPlanetId } from "@/game/planets/features";
import type {
    Location,
    PreSpacefaringSettlementCandidate,
} from "@/game/types";

type CandidatePlanet = Pick<
    Location,
    "id" | "isEmpty" | "explored" | "outpostId" | "preSpacefaringContact"
>;

export function getPreSpacefaringSettlementCandidate(
    planet: CandidatePlanet,
    hasBase: boolean,
): PreSpacefaringSettlementCandidate | null {
    if (
        !planet.isEmpty ||
        !planet.explored ||
        planet.preSpacefaringContact ||
        planet.outpostId ||
        hasBase
    ) {
        return null;
    }

    const seed = hashPlanetId(planet.id);
    if (seed % PRE_SPACEFARING_SETTLEMENT_ROLL_DIVISOR !== 0) return null;

    const civilization =
        PRE_SPACEFARING_CIVILIZATIONS[
            Math.floor(seed / PRE_SPACEFARING_SETTLEMENT_ROLL_DIVISOR) %
                PRE_SPACEFARING_CIVILIZATIONS.length
        ];
    const tileIndex =
        PRE_SPACEFARING_SETTLEMENT_TILE_INDICES[
            Math.floor(
                seed /
                    (PRE_SPACEFARING_SETTLEMENT_ROLL_DIVISOR *
                        PRE_SPACEFARING_CIVILIZATIONS.length),
            ) % PRE_SPACEFARING_SETTLEMENT_TILE_INDICES.length
        ];

    return {
        civilizationId: civilization.id,
        development: civilization.development,
        tileIndex,
    };
}
