export type NavigatorTarget = { sectorId: number; locationId: string };

export type KnownLocationIntel = {
  sectorId: number;
  locationId: string;
  highestScanRange: number;
  visited: boolean;
};

export const getNavigatorLocationKey = (sectorId: number, locationId: string) =>
  `${sectorId}:${locationId}`;
