export function isLocationCountedAsVisited(
  loc: {
    id: string;
    visited?: boolean;
    defeated?: boolean;
    bossDefeated?: boolean;
    mined?: boolean;
    signalResolved?: boolean;
    derelictExplored?: boolean;
    scoutedTimes?: number;
    planetaryDrilled?: boolean;
    atmosphereAnalyzed?: boolean;
    expeditionCompleted?: boolean;
    wreckPassesDone?: number;
    gasGiantLastDiveAt?: number;
  },
  completedLocations: string[],
) {
  return (
    loc.visited ||
    completedLocations.includes(loc.id) ||
    loc.defeated ||
    loc.bossDefeated ||
    loc.mined ||
    loc.signalResolved ||
    loc.derelictExplored ||
    (loc.scoutedTimes ?? 0) > 0 ||
    loc.planetaryDrilled ||
    loc.atmosphereAnalyzed ||
    loc.expeditionCompleted ||
    (loc.wreckPassesDone ?? 0) > 0 ||
    loc.gasGiantLastDiveAt !== undefined
  );
}
