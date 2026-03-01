import type { CrewMember } from "@/game/types";

export const getActiveAssignment = (crew: CrewMember, isCombat: boolean) =>
    isCombat ? crew.combatAssignment : crew.assignment;
