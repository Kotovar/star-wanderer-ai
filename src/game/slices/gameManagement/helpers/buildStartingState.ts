import { SHIP_TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/game/constants/shipTemplates";
import { LAUNCH_MODIFIERS } from "@/game/constants/launchModifiers";
import { ANCIENT_ARTIFACTS } from "@/game/constants/artifacts";
import { buildCrewMember } from "@/game/crew/buildCrewMember";
import type { CrewMember, GameState, Artifact } from "@/game/types";
import type { ResearchResourceType } from "@/game/types/research";
import type { RaceId } from "@/game/types/races";

export interface StartingStatePatch {
  credits: number;
  probes: number;
  ship: GameState["ship"];
  crew: CrewMember[];
  artifacts: Artifact[];
  /** Только ресурсы исследований — мёржится поверх initialState.research */
  researchResources: Partial<Record<ResearchResourceType, number>>;
  /** Стартовая репутация с расами (override поверх нейтральных 0) */
  raceReputation?: Partial<Record<RaceId, number>>;
}

/**
 * Создаёт патч к начальному состоянию игры на основе выбранного шаблона корабля
 * и активных модификаторов запуска.
 *
 * Намеренно не затрагивает `research.discoveredTechs` и другие поля — они берутся
 * из `initialState` в `restartGame`.
 */
export function buildStartingState(
  templateId: string,
  modifierIds: string[],
): StartingStatePatch {
  const template =
    SHIP_TEMPLATES.find((t) => t.id === templateId) ??
    SHIP_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID);

  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const activeModifiers = LAUNCH_MODIFIERS.filter((m) =>
    modifierIds.includes(m.id),
  );

  // ── Кредиты ──────────────────────────────────────────────────────────────
  let credits = template.credits;
  for (const mod of activeModifiers) {
    credits += mod.creditDelta;
  }
  credits = Math.max(0, credits);

  // ── Топливо ───────────────────────────────────────────────────────────────
  let fuel = template.fuel;
  let maxFuel = template.maxFuel;
  for (const mod of activeModifiers) {
    if (mod.fuelDelta) {
      fuel += mod.fuelDelta;
      maxFuel += mod.fuelDelta;
    }
  }

  // ── Модули ────────────────────────────────────────────────────────────────
  let modules = template.modules.map((m) => ({ ...m }));

  // Штраф к реактору
  const reactorPenalty = activeModifiers.reduce(
    (sum, mod) => sum + (mod.reactorPowerPenalty ?? 0),
    0,
  );
  if (reactorPenalty > 0) {
    modules = modules.map((m) =>
      m.type === "reactor" && m.power !== undefined
        ? { ...m, power: Math.max(1, m.power - reactorPenalty) }
        : m,
    );
  }

  // Синхронизируем capacity топливного бака с maxFuel
  modules = modules.map((m) =>
    m.type === "fueltank" ? { ...m, capacity: maxFuel } : m,
  );

  // Урон модулям (moduleDamagePercent)
  const totalDamagePercent = activeModifiers.reduce(
    (sum, mod) => sum + (mod.moduleDamagePercent ?? 0),
    0,
  );
  if (totalDamagePercent > 0) {
    const MIN_HEALTH = 10;
    modules = modules.map((m) => ({
      ...m,
      health: Math.max(
        MIN_HEALTH,
        Math.round(m.maxHealth * (1 - totalDamagePercent / 100)),
      ),
    }));
  }

  // ── Экипаж ────────────────────────────────────────────────────────────────
  const crewLimit = activeModifiers.reduce<number | null>((acc, mod) => {
    if (mod.crewLimit !== undefined) {
      return acc === null ? mod.crewLimit : Math.min(acc, mod.crewLimit);
    }
    return acc;
  }, null);

  const crewLevel = activeModifiers.reduce<number | null>((acc, mod) => {
    if (mod.crewLevel !== undefined) {
      return acc === null ? mod.crewLevel : Math.max(acc, mod.crewLevel);
    }
    return acc;
  }, null);

  const crewConfigs =
    crewLimit !== null ? template.crew.slice(0, crewLimit) : template.crew;

  const crew: CrewMember[] = crewConfigs.map((opts, index) =>
    buildCrewMember({
      ...opts,
      level:
        crewLevel ??
        (typeof opts.level === "number" ? opts.level : 1),
      id: opts.id ?? Date.now() + index,
    }),
  );

  // ── Исследовательские ресурсы ─────────────────────────────────────────────
  const researchResources: Partial<Record<ResearchResourceType, number>> = {
    ...(template.researchResources ?? {}),
  };
  for (const mod of activeModifiers) {
    if (mod.researchResources) {
      for (const [key, val] of Object.entries(mod.researchResources)) {
        const k = key as ResearchResourceType;
        researchResources[k] = (researchResources[k] ?? 0) + val;
      }
    }
  }

  // ── Стартовая репутация ───────────────────────────────────────────────────
  const raceReputation: Partial<Record<RaceId, number>> = {};
  for (const mod of activeModifiers) {
    if (mod.startRaceReputation) {
      for (const [raceId, value] of Object.entries(mod.startRaceReputation)) {
        const k = raceId as RaceId;
        raceReputation[k] = Math.max(-100, Math.min(100, (raceReputation[k] ?? 0) + value));
      }
    }
  }

  // ── Cursed артефакт ───────────────────────────────────────────────────────
  const wantsCursedArtifact = activeModifiers.some(
    (m) => m.startWithCursedArtifact,
  );
  const artifacts: Artifact[] = ANCIENT_ARTIFACTS.map((a) => ({ ...a }));
  if (wantsCursedArtifact) {
    const cursedUndiscovered = artifacts.filter(
      (a) => a.cursed && !a.discovered,
    );
    if (cursedUndiscovered.length > 0) {
      const picked =
        cursedUndiscovered[
        Math.floor(Math.random() * cursedUndiscovered.length)
        ];
      const idx = artifacts.findIndex((a) => a.id === picked.id);
      if (idx !== -1) {
        artifacts[idx] = {
          ...artifacts[idx],
          discovered: true,
          researched: true,
          effect: { ...artifacts[idx].effect, active: true },
        };
      }
    }
  }

  // ── Корабль ───────────────────────────────────────────────────────────────
  const crewCapacity =
    modules.find((m) => m.oxygen !== undefined)?.oxygen ?? 5;

  const ship: GameState["ship"] = {
    armor: 1,
    shields: 0,
    maxShields: 0,
    crewCapacity,
    modules,
    gridSize: 5,
    cargo: [],
    tradeGoods: [],
    fuel,
    maxFuel,
    mergeTraits: [],
  };

  const probes = template.probes;

  return {
    credits,
    probes,
    ship,
    crew,
    artifacts,
    researchResources,
    raceReputation: Object.keys(raceReputation).length > 0 ? raceReputation : undefined,
  };
}
