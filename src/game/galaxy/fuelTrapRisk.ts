export type FuelTrapRisk = {
    remainingFuel: number;
    minimumFuel: number | null;
};

export function getFuelTrapRisk(
    remainingFuel: number,
    departureOptions: Array<{ hasStation: boolean; fuelCost: number }>,
): FuelTrapRisk | null {
    const departureCosts = departureOptions
        .filter((option) => option.hasStation)
        .map((option) => option.fuelCost);
    const minimumFuel = departureCosts.length > 0 ? Math.min(...departureCosts) : null;

    return minimumFuel === null || remainingFuel < minimumFuel
        ? { remainingFuel, minimumFuel }
        : null;
}
