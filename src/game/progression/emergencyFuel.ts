export function getEmergencyFuelAmount(
  fuel: number,
  maxFuel: number,
  credits: number,
  minimumJumpCost: number,
  stationId: string,
  claimedStationIds: readonly string[],
  pricePerUnit: number,
): number {
  if (
    !Number.isFinite(minimumJumpCost) ||
    fuel >= minimumJumpCost ||
    claimedStationIds.includes(stationId)
  ) {
    return 0;
  }

  const deficit = Math.ceil(minimumJumpCost - fuel);
  if (credits >= deficit * pricePerUnit) return 0;
  return Math.max(0, Math.min(maxFuel - fuel, deficit));
}
