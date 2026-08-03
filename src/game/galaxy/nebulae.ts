import type { GalaxyTierAll, Nebula, Sector } from "@/game/types/locations";

const TIER_RADII: Record<GalaxyTierAll, number> = {
  1: 0.38,
  2: 0.67,
  3: 0.87,
  4: 1.1,
};

const hasProtectedBoss = (sector: Sector): boolean =>
  sector.locations.some(
    (location) =>
      location.bossId === "void_oracle" || location.bossId === "the_eternal",
  );

export const getSectorMapPoint = (sector: Sector): { x: number; y: number } => {
  const radius = TIER_RADII[sector.tier];
  const angle = sector.mapAngle ?? 0;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
};

export const routeIntersectsNebula = (
  origin: Sector,
  destination: Sector,
  nebula: Nebula,
): boolean => {
  const start = getSectorMapPoint(origin);
  const end = getSectorMapPoint(destination);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx ** 2 + dy ** 2;
  const projection = lengthSquared === 0
    ? 0
    : Math.max(
      0,
      Math.min(1, ((nebula.x - start.x) * dx + (nebula.y - start.y) * dy) / lengthSquared),
    );
  const closestX = start.x + projection * dx;
  const closestY = start.y + projection * dy;
  return (closestX - nebula.x) ** 2 + (closestY - nebula.y) ** 2 <= nebula.radius ** 2;
};

export const findRouteNebula = (
  origin: Sector | null,
  destination: Sector,
  nebulae: Nebula[],
): Nebula | null =>
  origin
    ? nebulae.find((nebula) => routeIntersectsNebula(origin, destination, nebula)) ?? null
    : null;

export const generateNebulae = (sectors: Sector[]): Nebula[] => {
  const start = sectors.find((sector) => sector.id === 0);
  if (!start) return [];

  const candidates = sectors.filter(
    (sector) =>
      (sector.tier === 2 || sector.tier === 3) &&
      sector.id !== 0 &&
      !hasProtectedBoss(sector),
  );
  if (candidates.length === 0) return [];

  const startPoint = getSectorMapPoint(start);
  const protectedSectors = sectors.filter(
    (sector) => sector.id === 0 || hasProtectedBoss(sector),
  );
  const startIndex = Math.floor(Math.random() * candidates.length);

  for (let offset = 0; offset < candidates.length; offset++) {
    const candidate = candidates[(startIndex + offset) % candidates.length];
    const candidatePoint = getSectorMapPoint(candidate);
    const nebula: Nebula = {
      id: "nebula-1",
      x: (startPoint.x + candidatePoint.x) / 2,
      y: (startPoint.y + candidatePoint.y) / 2,
      radius: 0.16,
    };
    const protectsRequiredSectors = protectedSectors.every((sector) => {
      const point = getSectorMapPoint(sector);
      return (point.x - nebula.x) ** 2 + (point.y - nebula.y) ** 2 > nebula.radius ** 2;
    });

    if (protectsRequiredSectors && routeIntersectsNebula(start, candidate, nebula)) {
      return [nebula];
    }
  }

  return [];
};
