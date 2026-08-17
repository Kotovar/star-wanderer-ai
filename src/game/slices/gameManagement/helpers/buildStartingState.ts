import { SHIP_TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/game/constants/shipTemplates";
import {
  LAUNCH_MODIFIERS,
  assertValidLaunchSelection,
  hasLaunchCargoCapacity,
} from "@/game/constants/launchModifiers";
import { RESEARCH_TREE } from "@/game/constants/research";
import { ANCIENT_ARTIFACTS } from "@/game/constants/artifacts";
import { ENGINE_MODULE_TYPES, REACTOR_MODULE_TYPES } from "@/game/constants/modules";
import { buildCrewMember } from "@/game/crew/buildCrewMember";
import type {
  Artifact,
  CrewMember,
  GameState,
  Goods,
  Module,
  ModuleType,
  TechnologyId,
  TradeGood,
} from "@/game/types";
import type { ResearchResourceType } from "@/game/types/research";
import type { ModuleRecipeId } from "@/game/types/crafting";
import type { GasType, StartingOutpost } from "@/game/types/outposts";
import type { RaceId } from "@/game/types/races";

export interface StartingStatePatch {
  credits: number;
  probes: number;
  ship: GameState["ship"];
  crew: CrewMember[];
  artifacts: Artifact[];
  /** Только ресурсы исследований — мёржится поверх initialState.research */
  researchResources: Partial<Record<ResearchResourceType, number>>;
  /** Стартовый газ — только dev-шаблоны */
  gases?: Partial<Record<GasType, number>>;
  /** Готовые постройки — только dev-шаблоны */
  startingOutposts?: StartingOutpost[];
  /** Найденные чертежи гибридных модулей — только dev-шаблоны */
  moduleRecipes?: ModuleRecipeId[];
  /** Стартовая репутация с расами (override поверх нейтральных 0) */
  raceReputation?: Partial<Record<RaceId, number>>;
  /** Расы, которые должны быть известны игроку с первого хода */
  knownRaces?: RaceId[];
  /** Нужно активировать подходящий текущему состоянию кризис сразу после старта */
  startsWithCrisis: boolean;
  /** После раскрытия стартового кризиса выдать соответствующий резерв */
  crisisReserveKit: boolean;
  /** Технологии, которые надо сразу засчитать изученными */
  startingTechIds?: TechnologyId[];
}

function applyStartingModuleLevels(
  modules: Module[],
  requestedLevels: Partial<Record<ModuleType, number>>,
): Module[] {
  return modules.map((module) => {
    const level = requestedLevels[module.type];
    if (level !== 2) return module;

    if (ENGINE_MODULE_TYPES.includes(module.type)) {
      return {
        ...module,
        level,
        fuelEfficiency: Math.max(1, (module.fuelEfficiency ?? 10) - 2),
        consumption: 2,
        defense: 2,
        maxHealth: 120,
        health: 120,
      };
    }

    if (module.type === "fueltank") {
      return {
        ...module,
        level,
        capacity: 120,
        defense: 2,
        maxHealth: 120,
        health: 120,
      };
    }

    return module;
  });
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

  if (!hasLaunchCargoCapacity(template, activeModifiers)) {
    throw new Error("Selected modifiers exceed template cargo capacity");
  }

  // ── Кредиты ──────────────────────────────────────────────────────────────
  const credits = assertValidLaunchSelection(
    template.credits,
    activeModifiers,
  );

  // ── Модули ────────────────────────────────────────────────────────────────
  let modules = template.modules.map((m) => ({ ...m }));
  const requestedModuleLevels = activeModifiers.reduce<
    Partial<Record<ModuleType, number>>
  >((levels, mod) => {
    for (const [type, level] of Object.entries(mod.startingModuleLevels ?? {})) {
      const moduleType = type as ModuleType;
      levels[moduleType] = Math.max(levels[moduleType] ?? 0, level);
    }
    return levels;
  }, {});
  modules = applyStartingModuleLevels(modules, requestedModuleLevels);

  // ── Топливо ───────────────────────────────────────────────────────────────
  let fuel = template.fuel;
  let maxFuel = Math.max(
    template.maxFuel,
    ...modules
      .filter((module) => module.type === "fueltank")
      .map((module) => module.capacity ?? 0),
  );
  for (const mod of activeModifiers) {
    if (mod.fuelDelta !== undefined) {
      fuel += mod.fuelDelta;
    }
    if (mod.maxFuelDelta !== undefined) {
      maxFuel += mod.maxFuelDelta;
    }
  }
  maxFuel = Math.max(0, maxFuel);
  fuel = Math.max(0, Math.min(fuel, maxFuel));

  // Штраф к реактору
  const reactorPenalty = activeModifiers.reduce(
    (sum, mod) => sum + (mod.reactorPowerPenalty ?? 0),
    0,
  );
  if (reactorPenalty > 0) {
    modules = modules.map((m) =>
      REACTOR_MODULE_TYPES.includes(m.type) && m.power !== undefined
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

  const targetedDamageMods = activeModifiers.filter(
    (mod) =>
      (mod.targetedModuleDamagePercent ?? 0) > 0 &&
      (mod.targetedModuleTypes?.length ?? 0) > 0,
  );
  for (const mod of targetedDamageMods) {
    const candidates = modules
      .map((module, index) => ({ module, index }))
      .filter(({ module }) => mod.targetedModuleTypes?.includes(module.type));

    if (candidates.length === 0) continue;

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    const damagedHealth = Math.max(
      10,
      Math.round(
        picked.module.maxHealth *
          (1 - (mod.targetedModuleDamagePercent ?? 0) / 100),
      ),
    );

    modules[picked.index] = {
      ...picked.module,
      health: Math.min(picked.module.health, damagedHealth),
    };
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

  // «Одиночка»: единственный член экипажа не устаёт и не теряет настроение
  const isHermitCrew = activeModifiers.some((mod) => mod.hermitCrew);

  const crew: CrewMember[] = crewConfigs.map((opts, index) => {
    const member = buildCrewMember({
      ...opts,
      level:
        crewLevel ??
        (typeof opts.level === "number" ? opts.level : 1),
      id: opts.id ?? Date.now() + index,
    });
    return isHermitCrew ? { ...member, hermit: true } : member;
  });

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
  const knownRaces = new Set<RaceId>();
  for (const mod of activeModifiers) {
    if (mod.startRaceReputation) {
      for (const [raceId, value] of Object.entries(mod.startRaceReputation)) {
        const k = raceId as RaceId;
        raceReputation[k] = Math.max(
          -100,
          Math.min(100, (raceReputation[k] ?? 0) + value),
        );
        knownRaces.add(k);
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

  const wantsRareArtifact = activeModifiers.some((m) => m.startWithRareArtifact);
  if (wantsRareArtifact) {
    const rareUndiscovered = artifacts.filter(
      (artifact) => artifact.rarity === "rare" && !artifact.discovered,
    );
    if (rareUndiscovered.length > 0) {
      const picked =
        rareUndiscovered[Math.floor(Math.random() * rareUndiscovered.length)];
      const index = artifacts.findIndex((artifact) => artifact.id === picked.id);
      if (index !== -1) {
        artifacts[index] = {
          ...artifacts[index],
          discovered: true,
          researched: true,
          // Как и стартовый проклятый: модификатор обещает артефакт, а не
          // домашнее задание сходить в панель и включить его
          effect: { ...artifacts[index].effect, active: true },
        };
      }
    }
  }

  const wantsStartingCrisis = activeModifiers.some((m) => m.startWithCrisis);
  const startingTechPool = Object.values(RESEARCH_TREE).filter(
    (tech) => tech.discovered && tech.prerequisites.length === 0,
  );
  const startingRandomTechCount = activeModifiers.reduce(
    (count, mod) => count + (mod.startingRandomTechCount ?? 0),
    0,
  );
  const randomStartingTechIds: TechnologyId[] = [];
  const remainingStartingTechs = [...startingTechPool];
  for (
    let index = 0;
    index < startingRandomTechCount && remainingStartingTechs.length > 0;
    index += 1
  ) {
    const pickedIndex = Math.floor(Math.random() * remainingStartingTechs.length);
    const [picked] = remainingStartingTechs.splice(pickedIndex, 1);
    randomStartingTechIds.push(picked.id);
  }
  const startingTechIds = [
    ...(template.startWithAllTechs
      ? Object.values(RESEARCH_TREE).map((tech) => tech.id)
      : []),
    ...randomStartingTechIds,
  ];

  const startingTradeGoods = new Map<Goods, number>();
  for (const mod of activeModifiers) {
    for (const [goodId, quantity] of Object.entries(mod.startingTradeGoods ?? {})) {
      const good = goodId as Goods;
      startingTradeGoods.set(good, (startingTradeGoods.get(good) ?? 0) + quantity);
    }
  }
  const tradeGoods: TradeGood[] = [...startingTradeGoods].map(
    ([item, quantity]) => ({ item, quantity, buyPrice: 0 }),
  );

  // ── Корабль ───────────────────────────────────────────────────────────────
  const crewCapacity =
    modules.find((m) => m.oxygen !== undefined)?.oxygen ?? 5;

  const ship: GameState["ship"] = {
    armor: 1,
    shields: 0,
    maxShields: 0,
    crewCapacity,
    modules,
    gridSize: template.gridSize ?? 5,
    cargo: [],
    tradeGoods,
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
    gases: template.gases,
    startingOutposts: template.startingOutposts,
    moduleRecipes: template.moduleRecipes,
    raceReputation: Object.keys(raceReputation).length > 0 ? raceReputation : undefined,
    knownRaces: knownRaces.size > 0 ? [...knownRaces] : undefined,
    startsWithCrisis: wantsStartingCrisis,
    crisisReserveKit: activeModifiers.some((mod) => mod.crisisReserveKit),
    startingTechIds:
      startingTechIds.length > 0 ? [...new Set(startingTechIds)] : undefined,
  };
}
