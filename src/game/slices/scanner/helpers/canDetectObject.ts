import type { LocationType } from "@/game/types";

const SCANNER_TARGET_TYPES: LocationType[] = [
  "friendly_ship",
  "derelict_ship",
  "enemy",
  "space_monster",
  "boss",
  "anomaly",
  "storm",
];

export const requiresScanner = (objectType: LocationType): boolean =>
  SCANNER_TARGET_TYPES.includes(objectType);

export const canDetectObject = (
  objectType: LocationType,
  scanRange: number,
  objectTier: number = 1,
): boolean => {
  if (scanRange >= 15) return true;

  if (objectType === "friendly_ship" || objectType === "derelict_ship") {
    return scanRange >= 3;
  }
  if (objectType === "storm") return scanRange >= 5;
  if (objectType === "boss") return scanRange >= 8;

  if (objectType === "enemy" || objectType === "space_monster") {
    if (objectTier <= 1) return scanRange >= 3;
    if (objectTier === 2) return scanRange >= 5;
    return scanRange >= 8;
  }

  if (objectType === "anomaly") {
    if (objectTier <= 1) return scanRange >= 3;
    if (objectTier === 2) return scanRange >= 5;
    if (objectTier === 3) return scanRange >= 8;
    if (objectTier === 4) return scanRange >= 15;
    return scanRange >= 3;
  }

  return false;
};
