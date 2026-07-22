import type { Artifact, Contract, Sector } from "@/game/types";
import type {
    GalaxyMapObjective,
    GalaxyMapObjectiveKind,
} from "@/game/galaxy/galaxy-map-utils";

type GalaxyMapObjectivesInput = {
    sectors: Sector[];
    activeContracts: Contract[];
    artifacts: Artifact[];
    completedLocations: string[];
    bossesVisible: boolean;
};

const getContractTargetSectorIds = (contract: Contract): number[] => {
    if (contract.type === "expedition_survey" && contract.expeditionDone) {
        return [];
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

const getContractTargetLabel = (contract: Contract, sector: Sector): string =>
    contract.targetLocationName ??
    contract.targetPlanetName ??
    contract.targetSectorName ??
    contract.sectorName ??
    sector.name;

/** Собирает уже известные цели для навигационного слоя карты без нового состояния. */
export const getGalaxyMapObjectives = ({
    sectors,
    activeContracts,
    artifacts,
    completedLocations,
    bossesVisible,
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
                addObjective("contract", sector, getContractTargetLabel(contract, sector));
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

    return [...objectives.values()];
};
