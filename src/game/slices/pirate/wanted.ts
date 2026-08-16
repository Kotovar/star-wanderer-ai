export const WANTED_CHECKPOINT_HEAT = 50;
export const WANTED_PURSUIT_HEAT = 75;
export const WANTED_HEAT_AFTER_CHECKPOINT = 45;
export const WANTED_HEAT_AFTER_PURSUIT = 25;

export const clampWantedHeat = (heat: number): number =>
    Math.max(0, Math.min(100, Math.round(heat)));

export const isWantedCheckpointRequired = (heat: number): boolean =>
    heat >= WANTED_CHECKPOINT_HEAT;

export const canFightWantedPursuit = (heat: number): boolean =>
    heat >= WANTED_PURSUIT_HEAT;

export const getWantedBribeCost = (heat: number): number =>
    200 + Math.max(0, heat - (WANTED_CHECKPOINT_HEAT - 1)) * 15;
