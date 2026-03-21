import type { Technology, TechnologyId } from "@/game/types";
import { TIER1_TECHS } from "./tier1";
import { TIER2_TECHS } from "./tier2";
import { TIER3_TECHS } from "./tier3";
import { TIER4_TECHS } from "./tier4";
import { TIER5_TECHS } from "./tier5";

export { RESEARCH_RESOURCES } from "./resources";
/**
 * Research tree data
 */
export const RESEARCH_TREE: Record<TechnologyId, Technology> = {
    ...TIER1_TECHS,
    ...TIER2_TECHS,
    ...TIER3_TECHS,
    ...TIER4_TECHS,
    ...TIER5_TECHS,
} as Record<TechnologyId, Technology>;

/**
 * Check if technology can be researched
 */
export function canResearchTech(
    techId: TechnologyId,
    researchedTechs: TechnologyId[],
): boolean {
    const tech = RESEARCH_TREE[techId];
    if (!tech) return false;
    if (tech.researched) return false;

    // Check prerequisites
    for (const prereq of tech.prerequisites) {
        if (!researchedTechs.includes(prereq)) {
            return false;
        }
    }

    return true;
}
