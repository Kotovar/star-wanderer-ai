type ReservedBoss = {
    id: string;
    name: string;
    bossType?: string;
};

type ReservedLocation = {
    id: string;
    type: string;
    name: string;
    bossId?: string;
    bossType?: string;
    bossDefeated?: boolean;
};

type ReservedSector = {
    id: number;
    tier: number;
    star?: { type?: string };
    locations: ReservedLocation[];
};

/** Размещает уникального босса в подходящем секторе, предпочитая сектор без другого босса. */
export const placeReservedBoss = (
    sectors: ReservedSector[],
    boss: ReservedBoss,
    {
        tier,
        blackHole = false,
        idSuffix,
    }: {
        tier?: number;
        blackHole?: boolean;
        idSuffix: string;
    },
): ReservedSector | undefined => {
    if (
        sectors.some((sector) =>
            sector.locations.some((location) => location.bossId === boss.id),
        )
    ) {
        return undefined;
    }

    const tierSectors = sectors.filter(
        (sector) => tier === undefined || sector.tier === tier,
    );
    const preferredSectors = tierSectors.filter((sector) =>
        blackHole
            ? sector.star?.type === "blackhole"
            : sector.star?.type !== "blackhole",
    );
    const candidates = preferredSectors.length > 0
        ? preferredSectors
        : blackHole
            ? []
            : tierSectors;
    const emptyCandidates = candidates.filter(
        (sector) => !sector.locations.some((location) => location.type === "boss"),
    );
    const target =
        emptyCandidates[Math.floor(Math.random() * emptyCandidates.length)] ??
        candidates[Math.floor(Math.random() * candidates.length)];

    if (!target) return undefined;

    target.locations.push({
        id: `${target.id}-reserved-${idSuffix}`,
        type: "boss",
        name: boss.name,
        bossId: boss.id,
        bossType: boss.bossType,
        bossDefeated: false,
    });

    return target;
};
