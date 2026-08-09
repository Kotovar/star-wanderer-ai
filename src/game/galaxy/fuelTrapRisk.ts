export type FuelTrapRisk = {
    remainingFuel: number;
    minimumFuel: number | null;
};

export type FuelRecoveryNeed = {
    targetFuel: number;
};

type FuelRecoveryOption = {
    hasStation: boolean;
    fuelCost: number;
    known: boolean;
    accessible: boolean;
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

export function getFuelRecoveryNeed(
    currentFuel: number,
    maxFuel: number,
    options: FuelRecoveryOption[],
): FuelRecoveryNeed | null {
    const nearest = options
        .filter(
            (option) =>
                option.known &&
                option.accessible &&
                option.hasStation &&
                option.fuelCost <= maxFuel,
        )
        .sort((left, right) => left.fuelCost - right.fuelCost)[0];

    return nearest && currentFuel < nearest.fuelCost
        ? { targetFuel: nearest.fuelCost }
        : null;
}
