import { RACES } from "../constants/races.ts";
import type { CrewMember } from "../types/crew.ts";

// Relative imports only (no `@/` alias): this module is loaded directly by
// scripts/check-crew-relation-events.mjs under plain `node --experimental-strip-types`,
// which does not resolve the `@/` path alias for real (non-type-only) imports.

export interface CrewRelationPair {
    a: CrewMember;
    b: CrewMember;
    relation: number;
}

/**
 * All living crew pairs from two different races with a known, nonzero
 * relation. `relations` in constants/races.ts isn't guaranteed to be defined
 * on both sides, so this checks either race's map.
 */
export function getCrewRelationPairs(crew: CrewMember[]): CrewRelationPair[] {
    const living = crew.filter((c) => c.health > 0);
    const pairs: CrewRelationPair[] = [];
    for (let i = 0; i < living.length; i++) {
        for (let j = i + 1; j < living.length; j++) {
            const a = living[i];
            const b = living[j];
            if (a.race === b.race) continue;
            const relation =
                RACES[a.race]?.relations?.[b.race] ??
                RACES[b.race]?.relations?.[a.race];
            if (typeof relation !== "number" || relation === 0) continue;
            pairs.push({ a, b, relation });
        }
    }
    return pairs;
}

export type CrewRelationEventType = "conflict" | "bonding";

export interface CrewRelationEvent {
    type: CrewRelationEventType;
    a: CrewMember;
    b: CrewMember;
    relation: number;
}

/**
 * Rolls whether a relation-driven crew event fires this turn. Each eligible
 * pair gets an independent roll (first hit wins); chance scales with
 * |relation| so strongly hostile/friendly pairs surface more often.
 */
export function rollCrewRelationEvent(
    crew: CrewMember[],
    chancePerPoint: number,
    rng: () => number = Math.random,
): CrewRelationEvent | null {
    for (const pair of getCrewRelationPairs(crew)) {
        const chance = Math.abs(pair.relation) * chancePerPoint;
        if (rng() < chance) {
            return {
                type: pair.relation < 0 ? "conflict" : "bonding",
                a: pair.a,
                b: pair.b,
                relation: pair.relation,
            };
        }
    }
    return null;
}
