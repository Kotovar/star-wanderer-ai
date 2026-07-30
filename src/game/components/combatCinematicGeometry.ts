import type { CombatProjectileOutcome } from "@/game/types/combatCinematics";

export interface CombatCinematicPoint {
  x: number;
  y: number;
}

export interface CombatCinematicSceneMetrics {
  scale: number;
  width: number;
  height: number;
}

export const COMBAT_CINEMATIC_MISS_LABEL_START_PROGRESS = 0.58;

const BASE_SCENE_WIDTH = 640;
const BASE_SCENE_HEIGHT = 360;
const MIN_SCENE_SCALE = 0.36;
const MAX_MODULE_ANCHOR_COLUMNS = 5;
const MODULE_ANCHOR_HALF_WIDTH = 52;
const MODULE_ANCHOR_HALF_HEIGHT = 36;
const MODULE_ANCHOR_MAX_COLUMN_GAP = 38;
const MODULE_ANCHOR_MAX_ROW_GAP = 46;
const DIRECT_HIT_PROGRESS = 0.62;
const SHIELD_BREACH_PROGRESS = 0.68;
const HULL_AFTER_BREACH_PROGRESS = 0.76;
const MISS_LABEL_RISE = 64;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function formatCombatCinematicAmount(amount: number): number {
  return Math.max(1, Math.round(amount));
}

function lerpPoint(
  from: CombatCinematicPoint,
  to: CombatCinematicPoint,
  progress: number,
): CombatCinematicPoint {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

export function getCombatCinematicSceneMetrics(
  width: number,
  height: number,
): CombatCinematicSceneMetrics {
  const scale = Math.max(
    MIN_SCENE_SCALE,
    Math.min(width / BASE_SCENE_WIDTH, height / BASE_SCENE_HEIGHT),
  );

  return { scale, width: width / scale, height: height / scale };
}

export function getCombatCinematicModuleAnchor(
  moduleCount: number,
  moduleIndex: number,
  center: CombatCinematicPoint,
  direction: -1 | 1,
): CombatCinematicPoint {
  const count = Math.max(1, Math.floor(moduleCount));
  const index = Math.min(count - 1, Math.max(0, Math.floor(moduleIndex)));
  const columns = count <= 3
    ? count
    : Math.min(MAX_MODULE_ANCHOR_COLUMNS, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  const row = Math.floor(index / columns);
  const rowStart = row * columns;
  const modulesInRow = Math.min(columns, count - rowStart);
  const column = index - rowStart;
  const columnGap = columns > 1
    ? Math.min(MODULE_ANCHOR_MAX_COLUMN_GAP, (MODULE_ANCHOR_HALF_WIDTH * 2) / (columns - 1))
    : 0;
  const rowGap = rows > 1
    ? Math.min(MODULE_ANCHOR_MAX_ROW_GAP, (MODULE_ANCHOR_HALF_HEIGHT * 2) / (rows - 1))
    : 0;

  return {
    x: center.x + direction * (column - (modulesInRow - 1) / 2) * columnGap,
    y: center.y + (row - (rows - 1) / 2) * rowGap,
  };
}

export type CombatHullDamageStage = "intact" | "scorched" | "breached";

/** Ниже этой доли прочности модуль оставляет на корпусе подпалину. */
const HULL_SCORCH_THRESHOLD = 0.35;

/**
 * Что показать на корпусе на месте модуля. Пробоина держится до конца боя,
 * поэтому по силуэту видно накопленный урон, а не только текущий кадр.
 */
export function getHullDamageStage(
  health: number,
  maxHealth: number,
): CombatHullDamageStage {
  if (health <= 0) return "breached";
  if (maxHealth <= 0) return "intact";
  return health / maxHealth < HULL_SCORCH_THRESHOLD ? "scorched" : "intact";
}

export function getMissLabelPoint(
  targetCenter: CombatCinematicPoint,
  progress: number,
): CombatCinematicPoint {
  const labelProgress = clamp(
    (progress - COMBAT_CINEMATIC_MISS_LABEL_START_PROGRESS) /
      (1 - COMBAT_CINEMATIC_MISS_LABEL_START_PROGRESS),
  );

  return {
    x: targetCenter.x,
    y: targetCenter.y - labelProgress * MISS_LABEL_RISE,
  };
}

export function getShieldImpactPoint(
  source: CombatCinematicPoint,
  target: CombatCinematicPoint,
  shieldCenter: CombatCinematicPoint,
  radiusX: number,
  radiusY: number,
): CombatCinematicPoint {
  const directionX = target.x - source.x;
  const directionY = target.y - source.y;
  const sourceX = source.x - shieldCenter.x;
  const sourceY = source.y - shieldCenter.y;
  const a = (directionX / radiusX) ** 2 + (directionY / radiusY) ** 2;
  if (a === 0) {
    return { x: shieldCenter.x - radiusX, y: shieldCenter.y };
  }
  const b = 2 * (
    (sourceX * directionX) / radiusX ** 2 +
    (sourceY * directionY) / radiusY ** 2
  );
  const c = (sourceX / radiusX) ** 2 + (sourceY / radiusY) ** 2 - 1;
  const discriminant = b ** 2 - 4 * a * c;
  if (discriminant < 0) return target;

  const root = Math.sqrt(discriminant);
  const progress = [
    (-b - root) / (2 * a),
    (-b + root) / (2 * a),
  ].find((candidate) => candidate >= 0 && candidate <= 1);
  if (progress === undefined) return target;

  return lerpPoint(source, target, progress);
}

export function getProjectilePathPoint(
  source: CombatCinematicPoint,
  shieldImpact: CombatCinematicPoint,
  moduleTarget: CombatCinematicPoint,
  outcome: CombatProjectileOutcome,
  progress: number,
): CombatCinematicPoint {
  const travel = clamp(progress);
  if (outcome === "shield" || outcome === "absorbed") {
    return lerpPoint(
      source,
      shieldImpact,
      clamp(travel / DIRECT_HIT_PROGRESS),
    );
  }
  if (outcome === "shield_and_hull") {
    if (travel <= SHIELD_BREACH_PROGRESS) {
      return lerpPoint(
        source,
        shieldImpact,
        travel / SHIELD_BREACH_PROGRESS,
      );
    }
    return lerpPoint(
      shieldImpact,
      moduleTarget,
      clamp(
        (travel - SHIELD_BREACH_PROGRESS) /
          (HULL_AFTER_BREACH_PROGRESS - SHIELD_BREACH_PROGRESS),
      ),
    );
  }

  if (outcome === "miss" || outcome === "intercepted") {
    return lerpPoint(source, moduleTarget, travel);
  }

  return lerpPoint(
    source,
    moduleTarget,
    clamp(travel / DIRECT_HIT_PROGRESS),
  );
}
