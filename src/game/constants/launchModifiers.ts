import type { ResearchResourceType } from "@/game/types/research";

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
  /** Изменение стартового топлива и макс. топлива */
  fuelDelta?: number;
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
];
