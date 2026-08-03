import type { TravelingState } from "@/game/types";

export const addPilotAsteroidManeuverDelay = (
  traveling: TravelingState,
): TravelingState => ({
  ...traveling,
  turnsLeft: traveling.turnsLeft + 1,
  turnsTotal: traveling.turnsTotal + 1,
});
