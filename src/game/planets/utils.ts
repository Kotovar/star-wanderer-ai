import type { PlanetType } from "@/game/types";
import { PLANET_CLASS_MAP } from "@/game/constants";

export const getPlanetBackgroundClass = (
    planetType: PlanetType | undefined,
) => {
    if (!planetType) return "";

    return PLANET_CLASS_MAP[planetType];
};
