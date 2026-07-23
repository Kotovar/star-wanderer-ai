type CrisisProgress = Readonly<{ turnsRemaining: number }>;

export const CRISIS_STAGES = [
  { id: "incident", startsAt: 0, effectMultiplier: 1, responseChanceMultiplier: 1 },
  { id: "escalation", startsAt: 0.25, effectMultiplier: 1.4, responseChanceMultiplier: 0.9 },
  { id: "critical", startsAt: 0.55, effectMultiplier: 1.9, responseChanceMultiplier: 0.78 },
  { id: "catastrophic", startsAt: 0.8, effectMultiplier: 2.5, responseChanceMultiplier: 0.65 },
] as const;

export type CrisisStage = (typeof CRISIS_STAGES)[number];

export const getCrisisStage = (
  activeCrisis: CrisisProgress,
  duration: number,
): CrisisStage => {
  const elapsedRatio = Math.max(
    0,
    Math.min(1, (duration - activeCrisis.turnsRemaining) / Math.max(1, duration)),
  );
  let stage: CrisisStage = CRISIS_STAGES[0];
  for (const candidate of CRISIS_STAGES) {
    if (elapsedRatio >= candidate.startsAt) stage = candidate;
  }
  return stage;
};

export const getCrisisResponseChance = (
  baseChance: number,
  activeCrisis: CrisisProgress,
  duration: number,
) => Math.max(0.05, baseChance * getCrisisStage(activeCrisis, duration).responseChanceMultiplier);
