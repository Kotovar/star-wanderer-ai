export const getDiminishingPlanetBonus = (
    currentBonus: number,
    baseBonus: number,
    scale: number,
): number => {
    const currentUnits = Math.round(currentBonus * scale);
    const capUnits = Math.round(baseBonus * scale * 2);

    return Math.max(0, Math.ceil((capUnits - currentUnits) / 2)) / scale;
};
