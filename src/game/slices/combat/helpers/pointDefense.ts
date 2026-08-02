export type PointDefenseInterceptor = {
  level?: number;
  operatorBonus?: number;
  mergeBonus?: number;
};

export type PointDefenseWeapon =
  | "missile"
  | "siege_torpedo"
  | "quantum_torpedo";

type PointDefenseModule = {
  id: number;
  type: string;
  health: number;
  level?: number;
};

type PointDefenseOperator = {
  health: number;
  level?: number;
  moduleId: number;
  combatAssignment?: string | null;
};

const POINT_DEFENSE_CHANCES: Record<
  PointDefenseWeapon,
  { base: number; cap: number }
> = {
  missile: { base: 0.2, cap: 0.5 },
  siege_torpedo: { base: 0.45, cap: 0.7 },
  quantum_torpedo: { base: 0.08, cap: 0.2 },
};

export function isInterceptableWeapon(
  weapon: string,
): weapon is PointDefenseWeapon {
  return weapon in POINT_DEFENSE_CHANCES;
}

export function getActivePointDefense<T extends PointDefenseModule>(
  modules: readonly T[],
): T | undefined {
  return getActivePointDefenses(modules)[0];
}

/**
 * Живые ПРО от сильного к слабому: и затухание в общем шансе, и модуль-стрелок
 * в кинематике должны брать один и тот же «первый» модуль.
 */
export function getActivePointDefenses<T extends PointDefenseModule>(
  modules: readonly T[],
): T[] {
  return modules
    .filter((module) => module.type === "point_defense" && module.health > 0)
    .toSorted((a, b) => (b.level ?? 1) - (a.level ?? 1));
}

export function getModulePointDefenseChance<T extends PointDefenseModule>(
  weapon: string,
  modules: readonly T[],
  interceptor: PointDefenseInterceptor = {},
): number {
  if (!isInterceptableWeapon(weapon)) return 0;
  const pointDefenses = getActivePointDefenses(modules);
  if (pointDefenses.length === 0) return 0;

  const moduleChance = pointDefenses
    .map((pointDefense) =>
      getPointDefenseChance(weapon, { level: pointDefense.level }),
    )
    .reduce((total, chance, index) => total + chance * 0.5 ** index, 0);
  const profile = POINT_DEFENSE_CHANCES[weapon];
  return Math.min(
    profile.cap,
    moduleChance +
      (interceptor.operatorBonus ?? 0) +
      (interceptor.mergeBonus ?? 0),
  );
}

export function getPointDefenseOperatorBonus<T extends PointDefenseModule>(
  crew: readonly PointDefenseOperator[],
  modules: readonly T[],
): number {
  const pointDefenseIds = new Set(
    getActivePointDefenses(modules).map((module) => module.id),
  );
  const operator = crew.find(
    (crewMember) =>
      crewMember.health > 0 &&
      pointDefenseIds.has(crewMember.moduleId) &&
      crewMember.combatAssignment === "interception",
  );

  return operator ? 0.05 + Math.max(0, (operator.level ?? 1) - 1) * 0.01 : 0;
}

/**
 * Шансы перехвата по всем перехватываемым типам — «20/45/8». UI обязан брать
 * их отсюда: у торпед свои профили и свои капы, один хардкод по ракете врёт.
 */
export function formatPointDefenseChances(
  interceptor: PointDefenseInterceptor = {},
): string {
  return (Object.keys(POINT_DEFENSE_CHANCES) as PointDefenseWeapon[])
    .map((weapon) => Math.round(getPointDefenseChance(weapon, interceptor) * 100))
    .join("/");
}

export function getPointDefenseChance(
  weapon: string,
  interceptor: PointDefenseInterceptor,
): number {
  if (!isInterceptableWeapon(weapon)) return 0;

  const profile = POINT_DEFENSE_CHANCES[weapon];
  const levelBonus = Math.max(0, (interceptor.level ?? 1) - 1) * 0.05;
  return Math.min(
    profile.cap,
    profile.base + levelBonus + (interceptor.operatorBonus ?? 0) + (interceptor.mergeBonus ?? 0),
  );
}
