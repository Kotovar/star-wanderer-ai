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
  /** Процент урона, применяемый ко всем модулям при старте (0–100) */
  moduleDamagePercent?: number;
  /** Процент урона по одному случайному модулю выбранных типов при старте (0–100) */
  targetedModuleDamagePercent?: number;
  /** Допустимые типы модулей для точечного стартового урона */
  targetedModuleTypes?: ModuleType[];
  /** Стартовая репутация с расами (override поверх нейтральных 0) */
  startRaceReputation?: Partial<Record<RaceId, number>>;
}

// ─── Модификаторы ────────────────────────────────────────────────────────────

export const LAUNCH_MODIFIERS: LaunchModifier[] = [
  // ── Бонусы (дают преимущество, но стоят кредитов) ────────────────────────
  {
    id: "veteran_crew",
    nameKey: "launch_modifiers.veteran_crew.name",
    descriptionKey: "launch_modifiers.veteran_crew.description",
    icon: "⭐",
    type: "bonus",
    creditDelta: -1000,
    crewLevel: 3,
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
    creditDelta: +300,
    reactorPowerPenalty: 2,
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
    creditDelta: +800,
    fuelDelta: -60,
    targetedModuleDamagePercent: 35,
    targetedModuleTypes: ["engine", "fueltank"],
    researchResources: { tech_salvage: 1 },
  },
  {
    id: "damaged_ship",
    nameKey: "launch_modifiers.damaged_ship.name",
    descriptionKey: "launch_modifiers.damaged_ship.description",
    icon: "💥",
    type: "challenge",
    creditDelta: +500,
    moduleDamagePercent: 40,
  },
  {
    id: "wanted",
    nameKey: "launch_modifiers.wanted.name",
    descriptionKey: "launch_modifiers.wanted.description",
    icon: "🎯",
    type: "challenge",
    creditDelta: +400,
    startRaceReputation: { krylorian: -70 },
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
