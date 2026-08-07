import { RACES } from "../constants/races.ts";
import type { CrewMember } from "../types/crew.ts";

export const canBeAffectedByBiohazard = (member: CrewMember): boolean =>
  member.health > 0 && RACES[member.race].canGetSick !== false;

export const isCrewImmuneToBiohazard = (crew: readonly CrewMember[]): boolean =>
  !crew.some(canBeAffectedByBiohazard);
