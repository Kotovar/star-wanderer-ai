import type { Artifact, Contract, RunProfileArcTarget, Sector } from "@/game/types";
import { isKnownNavigatorTarget } from "@/game/navigator/intel";
import type { KnownLocationIntel, NavigatorTarget } from "@/game/types/navigator";
import type {
    GalaxyMapObjective,
    GalaxyMapObjectiveKind,
} from "@/game/galaxy/galaxy-map-utils";
import { getLocationName } from "@/lib/translationHelpers";

type GalaxyMapObjectivesInput = {
    sectors: Sector[];
    activeContracts: Contract[];
    artifacts: Artifact[];
    completedLocations: string[];
    runProfileArcTarget: RunProfileArcTarget | null;
    runProfileArcRewardClaimed: boolean;
    bossesVisible: boolean;
    knownLocationIntel: Record<string, KnownLocationIntel>;
    navigatorTargets: NavigatorTarget[];
    translate?: (key: string) => string;
};

const getContractTargetSectorIds = (contract: Contract): number[] => {
    if (contract.type === "expedition_survey" && contract.expeditionDone) {
        return [];
    }
    if (
        (contract.type === "pirate_smuggling" ||
            contract.type === "pirate_bounty" ||
            contract.type === "pirate_heist") &&
        contract.pirateObjectiveComplete &&
        typeof contract.sourceSector === "number"
    ) {
        return [contract.sourceSector];
    }

    const targetIds = new Set<number>();
    if (typeof contract.targetSector === "number") {
        targetIds.add(contract.targetSector);
    }
    if (typeof contract.sectorId === "number") {
        targetIds.add(contract.sectorId);
    }
    for (const sectorId of contract.targetSectors ?? []) {
        if (!contract.visitedSectors?.includes(sectorId)) {
            targetIds.add(sectorId);
        }
    }

    return [...targetIds];
};

const getContractTargetLabel = (
    contract: Contract,
    sector: Sector,
    translate: (key: string) => string,
): string =>
    getLocationName(
        (contract.pirateObjectiveComplete &&
        (contract.type === "pirate_smuggling" ||
            contract.type === "pirate_bounty" ||
            contract.type === "pirate_heist")
            ? contract.sourcePlanetName
            : contract.targetLocationName) ??
            contract.targetPlanetName ??
            contract.targetSectorName ??
            contract.sectorName ??
            sector.name,
        translate,
    );

/** Собирает уже известные цели для навигационного слоя карты без нового состояния. */
export const getGalaxyMapObjectives = ({
    sectors,
    activeContracts,
    artifacts,
    completedLocations,
    runProfileArcTarget,
    runProfileArcRewardClaimed,
    bossesVisible,
    knownLocationIntel,
    navigatorTargets,
    translate = (key) => key,
}: GalaxyMapObjectivesInput): GalaxyMapObjective[] => {
    const sectorsById = new Map(sectors.map((sector) => [sector.id, sector]));
    const sectorsByName = new Map(sectors.map((sector) => [sector.name, sector]));
    const objectives = new Map<string, GalaxyMapObjective>();

    const addObjective = (
        kind: GalaxyMapObjectiveKind,
        sector: Sector,
        label: string,
    ) => {
        const key = `${kind}:${sector.id}`;
        if (!objectives.has(key)) {
            objectives.set(key, { kind, sectorId: sector.id, label });
        }
    };

    for (const contract of activeContracts) {
        for (const sectorId of getContractTargetSectorIds(contract)) {
            const sector = sectorsById.get(sectorId);
            if (sector) {
                addObjective(
                    "contract",
                    sector,
                    getContractTargetLabel(contract, sector, translate),
                );
            }
        }
    }

    for (const artifact of artifacts) {
        if (!artifact.hinted || artifact.discovered || !artifact.hintedAt) continue;

        const sector = sectorsByName.get(artifact.hintedAt.sectorName);
        const location = sector?.locations.find(
            (candidate) => candidate.name === artifact.hintedAt?.locationName,
        );
        if (sector && location) {
            addObjective("artifact", sector, location.name);
        }
    }

    if (runProfileArcTarget && !runProfileArcRewardClaimed) {
        const sector = sectorsById.get(runProfileArcTarget.sectorId);
        if (sector) {
            addObjective("signal", sector, "location_types.profile_signal");
        }
    }

    if (bossesVisible) {
        for (const sector of sectors) {
            for (const location of sector.locations) {
                if (
                    location.type !== "boss" ||
                    location.bossDefeated ||
                    completedLocations.includes(location.id)
                ) {
                    continue;
                }

                addObjective(
                    location.bossId === "void_oracle" ? "final" : "boss",
                    sector,
                    location.name,
                );
            }
        }
    }

    for (const target of navigatorTargets) {
        if (!isKnownNavigatorTarget(target, knownLocationIntel)) continue;

        const sector = sectorsById.get(target.sectorId);
        if (sector) {
            addObjective("navigator", sector, "navigator.short_title");
        }
    }

    return [...objectives.values()];
};
