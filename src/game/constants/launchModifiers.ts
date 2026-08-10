import type { ModuleType } from "@/game/types/modules";
import type { ResearchResourceType } from "@/game/types/research";
import type { RaceId } from "@/game/types/races";
import type { Goods } from "@/game/types/goods";
import type { LocationWeightKey } from "@/game/galaxy/runProfiles";
import type { ShipTemplate } from "@/game/constants/shipTemplates";

// ─── Launch Modifier ──────────────────────────────────────────────────────────

export interface LaunchModifier {
  id: string;
  /** Ключ переводов: `launch_modifiers.{id}.name` */
  nameKey: string;
  /** Ключ переводов: `launch_modifiers.{id}.description` */
  descriptionKey: string;
  icon: string;
  /** bonus = даёт преимущество, challenge = усложняет, mixed = и то и то */
  type: "bonus" | "challenge" | "mixed";
  /** Модификаторы одной группы взаимоисключающие в UI новой игры */
  group?: "doctrine";
  /** ID модификаторов, которые нельзя выбирать вместе с этим */
  conflictsWith?: string[];
  /** Изменение стартовых кредитов */
  creditDelta: number;
  /** Задаёт стартовый баланс до цен остальных выбранных модификаторов */
  startingCredits?: number;
  /** Изменение стартового запаса топлива */
  fuelDelta?: number;
  /** Изменение максимальной вместимости бака */
  maxFuelDelta?: number;
  /** Уровни имеющихся модулей, с которыми начинается забег */
  startingModuleLevels?: Partial<Record<ModuleType, number>>;
  /** Дополнительные исследовательские ресурсы */
  researchResources?: Partial<Record<ResearchResourceType, number>>;
  /** Уровень старта всего экипажа (override, не суммируется с шаблоном) */
  crewLevel?: number;
  /** Насколько срезать мощность реактора (−N энергии) */
  reactorPowerPenalty?: number;
  /** Уменьшить стартовый экипаж до N первых членов из шаблона */
  crewLimit?: number;
  /** Запустить игру с одним случайным cursed артефактом в активном состоянии */
  startWithCursedArtifact?: boolean;
  /** Запустить игру с одной случайной исследованной реликвией редкого тира */
  startWithRareArtifact?: boolean;
  /** Запустить игру с активным случайным кризисом */
  startWithCrisis?: boolean;
  /** Выдать кризисный резерв, зависящий от раскрытого кризиса */
  crisisReserveKit?: boolean;
  /** Число случайных изученных корневых технологий на старте */
  startingRandomTechCount?: number;
  /** Процент урона, применяемый ко всем модулям при старте (0–100) */
  moduleDamagePercent?: number;
  /** Процент урона по одному случайному модулю выбранных типов при старте (0–100) */
  targetedModuleDamagePercent?: number;
  /** Допустимые типы модулей для точечного стартового урона */
  targetedModuleTypes?: ModuleType[];
  /** Стартовая репутация с расами (override поверх нейтральных 0) */
  startRaceReputation?: Partial<Record<RaceId, number>>;
  /** Торговые товары в трюме на старте */
  startingTradeGoods?: Partial<Record<Goods, number>>;

  // ── Эффекты на весь забег (читаются из state.startModifierIds) ─────────────
  /** Снижение потребления энергии каждым модулем, минимум 1 */
  moduleConsumptionReduction?: number;
  /** Экипаж не устаёт от назначений и не теряет настроение */
  hermitCrew?: boolean;
  /** Ремонт даёт двойной опыт и технолом */
  repairSalvage?: boolean;
  /** Множители весов локаций при генерации галактики */
  locationWeightMultipliers?: Partial<Record<LocationWeightKey, number>>;
  /** Доля прибавки к кредитам за победу в бою */
  combatLootBonus?: number;
  /** Доля прибавки к добыче с обломков и покинутых кораблей */
  salvageLootBonus?: number;
}

/** Числовые эффекты забега — суммируются по всем активным модификаторам */
type NumericRunEffect =
  | "moduleConsumptionReduction"
  | "combatLootBonus"
  | "salvageLootBonus";

/** Булевы эффекты забега — активны, если их даёт хотя бы один модификатор */
type FlagRunEffect = "hermitCrew" | "repairSalvage";

export interface CrisisReserveKit {
  labelKey: string;
  fuel?: number;
  researchResources?: Partial<Record<ResearchResourceType, number>>;
  tradeGoods?: Partial<Record<Goods, number>>;
}

const CRISIS_RESERVE_KITS: Record<string, CrisisReserveKit> = {
  raider_wave: {
    labelKey: "crisis_reserve.raider_wave",
    tradeGoods: { spares: 6 },
  },
  solar_flare: {
    labelKey: "crisis_reserve.solar_flare",
    researchResources: { energy_samples: 4 },
  },
  epidemic: {
    labelKey: "crisis_reserve.epidemic",
    tradeGoods: { medicine: 4 },
  },
  fuel_shortage: {
    labelKey: "crisis_reserve.fuel_shortage",
    fuel: 30,
  },
  nebula_front: {
    labelKey: "crisis_reserve.nebula_front",
    researchResources: { energy_samples: 5, tech_salvage: 2 },
  },
};

export function getCrisisReserveKit(crisisId: string): CrisisReserveKit {
  return (
    CRISIS_RESERVE_KITS[crisisId] ?? {
      labelKey: "crisis_reserve.generic",
      researchResources: { tech_salvage: 2 },
    }
  );
}

const getActiveModifiers = (modifierIds: readonly string[] | undefined) =>
  modifierIds?.length
    ? LAUNCH_MODIFIERS.filter((mod) => modifierIds.includes(mod.id))
    : [];

export const getStartingTradeGoodsVolume = (
  modifiers: readonly LaunchModifier[],
): number =>
  modifiers.reduce(
    (total, modifier) =>
      total +
      Object.values(modifier.startingTradeGoods ?? {}).reduce(
        (sum, quantity) => sum + (quantity ?? 0),
        0,
      ),
    0,
  );

const getTemplateFreeCargoSpace = (template: ShipTemplate): number => {
  const capacity = template.modules
    .filter((module) => module.type === "cargo")
    .reduce((sum, module) => sum + (module.capacity ?? 40), 0);
  const gasVolume = Object.values(template.gases ?? {}).reduce<number>(
    (sum, quantity) => sum + (quantity ?? 0),
    0,
  );

  return Math.max(0, capacity - template.probes - gasVolume);
};

export const hasLaunchCargoCapacity = (
  template: ShipTemplate,
  modifiers: readonly LaunchModifier[],
): boolean =>
  getStartingTradeGoodsVolume(modifiers) <=
  getTemplateFreeCargoSpace(template);

/** Суммарное значение числового эффекта активных модификаторов забега. */
export function getRunModifierValue(
  modifierIds: readonly string[] | undefined,
  effect: NumericRunEffect,
): number {
  return getActiveModifiers(modifierIds).reduce(
    (sum, mod) => sum + (mod[effect] ?? 0),
    0,
  );
}

/** Активен ли булев эффект забега. */
export function hasRunModifierFlag(
  modifierIds: readonly string[] | undefined,
  effect: FlagRunEffect,
): boolean {
  return getActiveModifiers(modifierIds).some((mod) => mod[effect] === true);
}

/** Перемноженные множители весов локаций от активных модификаторов. */
export function getRunModifierLocationWeights(
  modifierIds: readonly string[] | undefined,
): Partial<Record<LocationWeightKey, number>> {
  const weights: Partial<Record<LocationWeightKey, number>> = {};
  for (const mod of getActiveModifiers(modifierIds)) {
    for (const [key, value] of Object.entries(
      mod.locationWeightMultipliers ?? {},
    )) {
      const weightKey = key as LocationWeightKey;
      weights[weightKey] = (weights[weightKey] ?? 1) * value;
    }
  }
  return weights;
}

export function getLaunchCredits(
  startingCredits: number,
  modifiers: readonly LaunchModifier[],
) {
  const creditBaseline =
    modifiers.find((mod) => mod.startingCredits !== undefined)
      ?.startingCredits ?? startingCredits;
  return creditBaseline + modifiers.reduce(
    (sum, mod) => sum + mod.creditDelta,
    0,
  );
}

export function assertValidLaunchSelection(
  startingCredits: number,
  modifiers: readonly LaunchModifier[],
) {
  if (modifiers.filter((mod) => mod.group === "doctrine").length > 1) {
    throw new Error("Only one starting doctrine can be selected");
  }

  const modifierIds = new Set(modifiers.map((mod) => mod.id));
  const conflictingModifier = modifiers.find((mod) =>
    mod.conflictsWith?.some((modifierId) => modifierIds.has(modifierId)),
  );
  if (conflictingModifier) {
    throw new Error(`Conflicting launch modifier: ${conflictingModifier.id}`);
  }

  const credits = getLaunchCredits(startingCredits, modifiers);
  if (credits < 0) {
    throw new Error("Selected modifiers cost more than starting credits");
  }

  return credits;
}

// ─── Модификаторы ────────────────────────────────────────────────────────────

export const LAUNCH_MODIFIERS: LaunchModifier[] = [
  // ── Стартовые доктрины (выбирается максимум одна) ───────────────────────
  {
    id: "doctrine_explorer",
    nameKey: "launch_modifiers.doctrine_explorer.name",
    descriptionKey: "launch_modifiers.doctrine_explorer.description",
    icon: "🧭",
    type: "mixed",
    group: "doctrine",
    creditDelta: -600,
    startingModuleLevels: { engine: 2 },
  },
  {
    id: "doctrine_boss_hunter",
    nameKey: "launch_modifiers.doctrine_boss_hunter.name",
    descriptionKey: "launch_modifiers.doctrine_boss_hunter.description",
    icon: "⚔️",
    type: "mixed",
    group: "doctrine",
    creditDelta: -900,
    crewLevel: 2,
    fuelDelta: -20,
    startWithRareArtifact: true,
    conflictsWith: ["veteran_crew"],
  },
  {
    id: "doctrine_trader",
    nameKey: "launch_modifiers.doctrine_trader.name",
    descriptionKey: "launch_modifiers.doctrine_trader.description",
    icon: "💳",
    type: "mixed",
    group: "doctrine",
    creditDelta: 0,
    startingCredits: 3000,
    fuelDelta: -20,
    maxFuelDelta: -20,
    locationWeightMultipliers: { enemyShip: 1.5 },
  },
  {
    id: "doctrine_exile",
    nameKey: "launch_modifiers.doctrine_exile.name",
    descriptionKey: "launch_modifiers.doctrine_exile.description",
    icon: "☄️",
    type: "mixed",
    group: "doctrine",
    creditDelta: 0,
    startRaceReputation: {
      synthetic: -55,
      krylorian: -70,
      voidborn: -60,
      crystalline: -55,
    },
    startingTradeGoods: {
      rare_minerals: 3,
      electronics: 3,
      medicine: 4,
    },
    conflictsWith: ["wanted"],
  },

  // ── Бонусы (дают преимущество, но стоят кредитов) ────────────────────────
  {
    id: "veteran_crew",
    nameKey: "launch_modifiers.veteran_crew.name",
    descriptionKey: "launch_modifiers.veteran_crew.description",
    icon: "⭐",
    type: "bonus",
    creditDelta: -1000,
    crewLevel: 3,
    conflictsWith: ["doctrine_boss_hunter"],
  },
  {
    id: "extra_fuel",
    nameKey: "launch_modifiers.extra_fuel.name",
    descriptionKey: "launch_modifiers.extra_fuel.description",
    icon: "⛽",
    type: "bonus",
    creditDelta: -600,
    fuelDelta: 40,
    startingModuleLevels: { fueltank: 2 },
  },
  {
    id: "research_head_start",
    nameKey: "launch_modifiers.research_head_start.name",
    descriptionKey: "launch_modifiers.research_head_start.description",
    icon: "🔬",
    type: "bonus",
    creditDelta: -1000,
    startingRandomTechCount: 3,
  },
  {
    id: "random_starting_tech",
    nameKey: "launch_modifiers.random_starting_tech.name",
    descriptionKey: "launch_modifiers.random_starting_tech.description",
    icon: "🧬",
    type: "bonus",
    creditDelta: -800,
    startingRandomTechCount: 1,
  },

  // ── Испытания под билд (штраф платит структурой, а не кредитами) ─────────
  // Кредиты обесцениваются к сотому ходу, а штраф остаётся навсегда, поэтому
  // «продать штраф за деньги» — всегда проигрышная сделка. Вместо этого каждый
  // из них открывает сборку, которая иначе невозможна.
  {
    id: "solo_mission",
    nameKey: "launch_modifiers.solo_mission.name",
    descriptionKey: "launch_modifiers.solo_mission.description",
    icon: "👤",
    type: "mixed",
    creditDelta: 0,
    crewLimit: 1,
    crewLevel: 5,
    hermitCrew: true,
  },
  {
    id: "weakened_reactor",
    nameKey: "launch_modifiers.weakened_reactor.name",
    descriptionKey: "launch_modifiers.weakened_reactor.description",
    icon: "⚡",
    type: "mixed",
    creditDelta: 0,
    // Ставка на широкий дешёвый корабль: на старте минус, на десятке модулей плюс
    reactorPowerPenalty: 4,
    moduleConsumptionReduction: 1,
  },
  {
    id: "crisis_start",
    nameKey: "launch_modifiers.crisis_start.name",
    descriptionKey: "launch_modifiers.crisis_start.description",
    icon: "🚨",
    type: "challenge",
    creditDelta: +600,
    startWithCrisis: true,
    crisisReserveKit: true,
  },

  // ── Смешанные (риск + потенциальная награда) ──────────────────────────────
  {
    id: "cursed_relic",
    nameKey: "launch_modifiers.cursed_relic.name",
    descriptionKey: "launch_modifiers.cursed_relic.description",
    icon: "💀",
    type: "mixed",
    creditDelta: +500,
    startWithCursedArtifact: true,
  },

  {
    id: "stranded",
    nameKey: "launch_modifiers.stranded.name",
    descriptionKey: "launch_modifiers.stranded.description",
    icon: "🏚️",
    type: "mixed",
    creditDelta: 0,
    fuelDelta: -60,
    targetedModuleDamagePercent: 35,
    targetedModuleTypes: ["engine", "fueltank"],
    researchResources: { tech_salvage: 1 },
    // Далеко не улетишь — значит выжимай больше из каждой находки
    salvageLootBonus: 0.5,
    conflictsWith: ["damaged_ship"],
  },
  {
    id: "damaged_ship",
    nameKey: "launch_modifiers.damaged_ship.name",
    descriptionKey: "launch_modifiers.damaged_ship.description",
    icon: "💥",
    type: "mixed",
    creditDelta: 0,
    moduleDamagePercent: 40,
    // Разбитый корабль становится источником прогресса, а не налогом
    repairSalvage: true,
    conflictsWith: ["stranded"],
  },
  {
    id: "wanted",
    nameKey: "launch_modifiers.wanted.name",
    descriptionKey: "launch_modifiers.wanted.description",
    icon: "🎯",
    type: "mixed",
    creditDelta: 0,
    startRaceReputation: { krylorian: -70 },
    // Охотники за головами — стабильный ранний источник боевого дохода
    locationWeightMultipliers: { enemyShip: 1.6 },
    combatLootBonus: 0.5,
    conflictsWith: ["doctrine_exile"],
  },

  // ── Новый смешанный ───────────────────────────────────────────────────────
  {
    id: "salvaged_parts",
    nameKey: "launch_modifiers.salvaged_parts.name",
    descriptionKey: "launch_modifiers.salvaged_parts.description",
    icon: "🔩",
    type: "mixed",
    creditDelta: 0,
    moduleDamagePercent: 20,
    researchResources: { tech_salvage: 10 },
  },
];
