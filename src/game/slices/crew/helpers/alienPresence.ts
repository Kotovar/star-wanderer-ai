import type { CrewMember } from "@/game/types";

/**
 * Проверяет, подвержен ли член экипажа воздействию инопланетного присутствия
 * (не Синтетик, не той же расы, не тот же член экипажа)
 */
export const isAffectedByAlienPresence = (
    crewMember: CrewMember,
    alienCrewMember: CrewMember,
) =>
    crewMember.race !== "synthetic" &&
    crewMember.race !== alienCrewMember.race &&
    crewMember.id !== alienCrewMember.id;
