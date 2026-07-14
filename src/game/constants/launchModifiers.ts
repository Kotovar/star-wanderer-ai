import type { ModuleType } from "@/game/types/modules";
import type { ResearchResourceType } from "@/game/types/research";
import type { RaceId } from "@/game/types/races";

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
  /** Изменение стартового запаса топлива */
  fuelDelta?: number;
  /** Изменение максимальной вместимости бака */
  maxFuelDelta?: number;
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
  /** Запустить игру с активным случайным кризисом */
  startWithCrisis?: boolean;
  /** Запустить игру с одной случайной изученной стартовой технологией */
  startWithRandomTech?: boolean;
  /** Процент урона, применяемый ко всем модулям при старте (0–100) */
  moduleDamagePercent?: number;
  /** Процент урона по одному случайному модулю выбранных типов при старте (0–100) */
  targetedModuleDamagePercent?: number;
  /** Допустимые типы модулей для точечного стартового урона */
  targetedModuleTypes?: ModuleType[];
  /** Стартовая репутация с расами (override поверх нейтральных 0) */
  startRaceReputation?: Partial<Record<RaceId, number>>;
}

export function getLaunchCredits(
  startingCredits: number,
  modifiers: readonly LaunchModifier[],
) {
  return startingCredits + modifiers.reduce(
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
    creditDelta: -400,
    fuelDelta: 40,
    maxFuelDelta: 40,
    researchResources: {
      ancient_data: 4,
      tech_salvage: 2,
    },
  },
  {
    id: "doctrine_boss_hunter",
    nameKey: "launch_modifiers.doctrine_boss_hunter.name",
    descriptionKey: "launch_modifiers.doctrine_boss_hunter.description",
    icon: "⚔️",
    type: "mixed",
    group: "doctrine",
    creditDelta: -700,
    crewLevel: 2,
    fuelDelta: -20,
    conflictsWith: ["veteran_crew"],
  },
  {
    id: "doctrine_trader",
    nameKey: "launch_modifiers.doctrine_trader.name",
    descriptionKey: "launch_modifiers.doctrine_trader.description",
    icon: "💳",
    type: "mixed",
    group: "doctrine",
    creditDelta: 900,
    fuelDelta: -25,
    maxFuelDelta: -25,
  },
  {
    id: "doctrine_exile",
    nameKey: "launch_modifiers.doctrine_exile.name",
    descriptionKey: "launch_modifiers.doctrine_exile.description",
    icon: "☄️",
    type: "mixed",
    group: "doctrine",
    creditDelta: 700,
    startRaceReputation: { krylorian: -45 },
    moduleDamagePercent: 15,
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
    creditDelta: -500,
    fuelDelta: 50,
    maxFuelDelta: 50,
  },
  {
    id: "research_head_start",
    nameKey: "launch_modifiers.research_head_start.name",
    descriptionKey: "launch_modifiers.research_head_start.description",
    icon: "🔬",
    type: "bonus",
    creditDelta: -300,
    researchResources: {
      ancient_data: 5,
      tech_salvage: 5,
    },
  },
  {
    id: "random_starting_tech",
    nameKey: "launch_modifiers.random_starting_tech.name",
    descriptionKey: "launch_modifiers.random_starting_tech.description",
    icon: "🧬",
    type: "bonus",
    creditDelta: -800,
    startWithRandomTech: true,
  },

  // ── Испытания (дают трудности, но добавляют кредиты) ─────────────────────
  {
    id: "solo_mission",
    nameKey: "launch_modifiers.solo_mission.name",
    descriptionKey: "launch_modifiers.solo_mission.description",
    icon: "👤",
    type: "challenge",
    creditDelta: +600,
    crewLimit: 1,
  },
  {
    id: "weakened_reactor",
    nameKey: "launch_modifiers.weakened_reactor.name",
    descriptionKey: "launch_modifiers.weakened_reactor.description",
    icon: "⚡",
    type: "challenge",
    creditDelta: +100,
    reactorPowerPenalty: 2,
  },
  {
    id: "crisis_start",
    nameKey: "launch_modifiers.crisis_start.name",
    descriptionKey: "launch_modifiers.crisis_start.description",
    icon: "🚨",
    type: "challenge",
    creditDelta: +1200,
    startWithCrisis: true,
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

  // ── Новые испытания ───────────────────────────────────────────────────────
  {
    id: "stranded",
    nameKey: "launch_modifiers.stranded.name",
    descriptionKey: "launch_modifiers.stranded.description",
    icon: "🏚️",
    type: "challenge",
    creditDelta: +200,
    fuelDelta: -60,
    targetedModuleDamagePercent: 35,
    targetedModuleTypes: ["engine", "fueltank"],
    researchResources: { tech_salvage: 1 },
    conflictsWith: ["damaged_ship"],
  },
  {
    id: "damaged_ship",
    nameKey: "launch_modifiers.damaged_ship.name",
    descriptionKey: "launch_modifiers.damaged_ship.description",
    icon: "💥",
    type: "challenge",
    creditDelta: +200,
    moduleDamagePercent: 40,
    conflictsWith: ["stranded"],
  },
  {
    id: "wanted",
    nameKey: "launch_modifiers.wanted.name",
    descriptionKey: "launch_modifiers.wanted.description",
    icon: "🎯",
    type: "challenge",
    creditDelta: +400,
    startRaceReputation: { krylorian: -70 },
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
