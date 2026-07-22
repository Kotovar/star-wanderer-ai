import { store as i18nStore } from "@/lib/useTranslation";
import { getArchiveHintLocations } from "@/game/artifacts/utils";
import { SPACE_MONSTERS } from "@/game/constants/spaceMonsters";
import { grantTimedEffect } from "@/game/effects/timedEffects";
import type { Artifact, GameStore, Location, SetState } from "@/game/types";

type ArtifactHint = {
    artifactId: string;
    hintedAt: NonNullable<Artifact["hintedAt"]>;
};

const getCrystalHydraArtifactHint = (
    state: GameStore,
): ArtifactHint | null => {
    const hintedAt = getArchiveHintLocations(
        state.galaxy.sectors,
        state.currentSector?.id,
    )[0];
    const artifact = state.artifacts.find(
        (candidate) => !candidate.discovered && !candidate.hinted,
    );

    return artifact && hintedAt ? { artifactId: artifact.id, hintedAt } : null;
};

export const resonateWithSpaceMonster = (
    set: SetState,
    get: () => GameStore,
): void => {
    const location = get().currentLocation;
    if (
        !location ||
        location.type !== "space_monster" ||
        location.spaceMonsterResolved === "hunted" ||
        !location.spaceMonsterType
    ) {
        return;
    }

    const state = get();
    const monster = SPACE_MONSTERS[location.spaceMonsterType];
    if (state.activeEffects.some((effect) => effect.definitionId === monster.resonanceEffect)) {
        get().addLog(
            i18nStore.t("space_monsters.logs.resonance_active"),
            "info",
        );
        return;
    }

    if (state.probes < 1) {
        get().addLog(
            i18nStore.t("space_monsters.logs.insufficient_probes"),
            "warning",
        );
        return;
    }

    const firstContact = location.spaceMonsterInsightUsed
        ? undefined
        : monster.firstContact;
    const artifactHint =
        firstContact?.type === "artifact_hint"
            ? getCrystalHydraArtifactHint(state)
            : null;
    const crewHealing =
        firstContact?.type === "heal_crew"
            ? state.crew.reduce(
                  (total, crewMember) =>
                      total +
                      (crewMember.health > 0
                          ? Math.min(
                                firstContact.value,
                                crewMember.maxHealth - crewMember.health,
                            )
                          : 0),
                  0,
              )
            : 0;
    const fuelCapacity = Math.max(
        state.ship.maxFuel,
        state.getFuelCapacity(),
    );
    const fuelRestored =
        firstContact?.type === "refuel"
            ? Math.min(
                  Math.max(3, Math.floor((fuelCapacity * firstContact.value) / 100)),
                  Math.max(0, fuelCapacity - state.ship.fuel),
              )
            : 0;

    set((s) => {
        if (!firstContact) {
            return { probes: s.probes - 1, gameMode: "sector_map" };
        }

        const markInsight = (candidate: Location): Location =>
            candidate.id === location.id
                ? { ...candidate, spaceMonsterInsightUsed: true }
                : candidate;
        const updateLocation = (candidate: Location): Location => {
            const insightLocation = markInsight(candidate);
            return firstContact.type === "reveal_sector"
                ? { ...insightLocation, signalRevealed: true }
                : insightLocation;
        };
        const currentLocation = s.currentLocation
            ? updateLocation(s.currentLocation)
            : s.currentLocation;
        const currentSector = s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map(updateLocation),
              }
            : null;
        const baseUpdate = {
            probes: s.probes - 1,
            gameMode: "sector_map" as const,
            currentLocation,
            currentSector,
            galaxy: currentSector
                ? {
                      ...s.galaxy,
                      sectors: s.galaxy.sectors.map((sector) =>
                          sector.id === currentSector.id ? currentSector : sector,
                      ),
                  }
                : s.galaxy,
        };

        switch (firstContact.type) {
            case "reveal_sector":
                return baseUpdate;
            case "heal_crew":
                return {
                    ...baseUpdate,
                    crew: s.crew.map((crewMember) => ({
                        ...crewMember,
                        health:
                            crewMember.health > 0
                                ? Math.min(
                                      crewMember.maxHealth,
                                      crewMember.health + firstContact.value,
                                  )
                                : crewMember.health,
                    })),
                };
            case "refuel":
                return {
                    ...baseUpdate,
                    ship: {
                        ...s.ship,
                        fuel: s.ship.fuel + fuelRestored,
                    },
                };
            case "artifact_hint":
                return {
                    ...baseUpdate,
                    artifacts: artifactHint
                        ? s.artifacts.map((artifact) =>
                              artifact.id === artifactHint.artifactId
                                  ? {
                                        ...artifact,
                                        hinted: true,
                                        hintSource: "space_monster",
                                        hintedAt: artifactHint.hintedAt,
                                    }
                                  : artifact,
                          )
                        : s.artifacts,
                    research: artifactHint
                        ? s.research
                        : {
                              ...s.research,
                              resources: {
                                  ...s.research.resources,
                                  quantum_crystals:
                                      (s.research.resources.quantum_crystals ??
                                          0) + 1,
                              },
                          },
                };
        }
    });

    if (firstContact) {
        switch (firstContact.type) {
            case "reveal_sector":
                get().addLog(
                    i18nStore.t("space_monsters.logs.first_contact_sector_scan"),
                    "info",
                );
                break;
            case "heal_crew":
                get().addLog(
                    crewHealing > 0
                        ? i18nStore.t(
                              "space_monsters.logs.first_contact_crew_heal",
                              { value: crewHealing },
                          )
                        : i18nStore.t(
                              "space_monsters.logs.first_contact_crew_healthy",
                          ),
                    "info",
                );
                break;
            case "refuel":
                get().addLog(
                    fuelRestored > 0
                        ? i18nStore.t(
                              "space_monsters.logs.first_contact_refuel",
                              { value: fuelRestored },
                          )
                        : i18nStore.t(
                              "space_monsters.logs.first_contact_fuel_full",
                          ),
                    "info",
                );
                break;
            case "artifact_hint":
                get().addLog(
                    artifactHint
                        ? i18nStore.t(
                              "space_monsters.logs.first_contact_artifact_hint",
                              {
                                  sector: artifactHint.hintedAt.sectorName,
                                  location: artifactHint.hintedAt.locationName,
                              },
                          )
                        : i18nStore.t(
                              "space_monsters.logs.first_contact_crystal_shard",
                          ),
                    "info",
                );
                break;
        }
    }

    get().addLog(
        i18nStore.t("space_monsters.logs.resonance", {
            name: i18nStore.t(monster.nameKey),
        }),
        "info",
    );
    grantTimedEffect(monster.resonanceEffect, set, get);
};
