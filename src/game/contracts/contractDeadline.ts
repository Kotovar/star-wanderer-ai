import type { Contract } from "@/game/types";

type TimedContract = Pick<Contract, "acceptedAt" | "timeLimit">;

const STANDARD_CONTRACT_DEADLINES: Partial<Record<Contract["type"], number>> = {
  delivery: 8,
  combat: 7,
  bounty: 7,
  expedition_survey: 10,
};

const getRawTurnsRemaining = (
  contract: TimedContract,
  currentTurn: number,
): number | null => {
  if (contract.timeLimit === undefined || contract.acceptedAt === undefined) {
    return null;
  }

  return contract.timeLimit - (currentTurn - contract.acceptedAt);
};

export const getContractTurnsRemaining = (
  contract: TimedContract,
  currentTurn: number,
): number | null => {
  const remaining = getRawTurnsRemaining(contract, currentTurn);
  return remaining === null ? null : Math.max(0, remaining);
};

export const isContractExpired = (
  contract: TimedContract,
  currentTurn: number,
): boolean => {
  const remaining = getRawTurnsRemaining(contract, currentTurn);
  return remaining !== null && remaining <= 0;
};

export const getGeneratedContractTimeLimit = (
  type: Contract["type"],
  sourceTier: number,
  targetTier: number,
): number | undefined => {
  const base = STANDARD_CONTRACT_DEADLINES[type];
  if (base === undefined) return undefined;

  return base + Math.abs(targetTier - sourceTier) * 2 + Math.max(0, sourceTier - 1);
};
