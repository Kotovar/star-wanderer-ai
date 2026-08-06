import { areModulesAdjacent } from "../../../modules/adjacency.ts";
import type {
  CrewMember,
  CrewAutomationMemory,
  CrewAutomationMemoryEntry,
  CrewAutomationMode,
  CrewAutomationTask,
} from "../../../types/crew";
import type { Module, ModuleType } from "../../../types/modules";

export type { CrewAutomationMemory, CrewAutomationMemoryEntry, CrewAutomationMode, CrewAutomationTask };

export interface CrewAutomationDecision {
  crewId: number;
  targetModuleId: number | null;
  nextModuleId: number | null;
  task: CrewAutomationTask;
  priority: number;
}

export interface CrewAutomationPlan {
  decisions: CrewAutomationDecision[];
  memory: CrewAutomationMemory;
}

export interface CrewAutomationInput {
  crew: CrewMember[];
  modules: Module[];
  mode: CrewAutomationMode;
  memory: CrewAutomationMemory;
  hasActiveResearch: boolean;
  passiveRegenByCrew?: Record<number, number>;
  mergeableModuleIds?: number[];
  enabled?: boolean;
}

const PRIORITY = {
  safety: 600,
  brokenRepair: 500,
  criticalRepair: 450,
  healing: 400,
  role: 300,
  work: 200,
  rest: 100,
} as const;

const MEDICAL_MODULE_TYPES = new Set<ModuleType>([
  "medical",
  "bio_research_lab",
  "habitat_module",
]);

const REST_MODULE_TYPES = new Set<ModuleType>([
  "quarters",
  "habitat_module",
  "medical",
  "bio_research_lab",
]);

const LAB_MODULE_TYPES = new Set<ModuleType>([
  "lab",
  "bio_research_lab",
  "deep_survey_array",
]);

const isActive = (module: Module) =>
  !module.disabled && !module.manualDisabled && module.health > 0;

const isCritical = (module: Module) =>
  (module.health / Math.max(module.maxHealth, 1)) * 100 < 30;

const isWalkable = (module: Module, targetModuleId: number) =>
  !module.manualDisabled && (module.health > 0 || module.id === targetModuleId);

const isDamaged = (module: Module) => module.health < module.maxHealth;

const getMedicalHealing = (module: Module) =>
  MEDICAL_MODULE_TYPES.has(module.type) && isActive(module)
    ? module.healing ?? 5
    : 0;

const getCriticalDamage = (module: Module) => (module.health <= 0 ? 20 : 5);

const getNegativeMoralePenalty = (crew: CrewMember[], moduleId: number, crewId: number) =>
  crew.some(
    (member) =>
      member.id !== crewId &&
      member.moduleId === moduleId &&
      member.traits.some((trait) => (trait.effect.moduleMorale ?? 0) < 0),
  )
    ? 20
    : 0;

const getPath = (
  modules: Module[],
  fromModuleId: number,
  targetModuleId: number,
): number[] | null => {
  if (fromModuleId === targetModuleId) return [fromModuleId];

  const byId = new Map(modules.map((module) => [module.id, module]));
  const start = byId.get(fromModuleId);
  const target = byId.get(targetModuleId);
  if (!start || !target || !isWalkable(target, targetModuleId)) return null;

  const queue = [fromModuleId];
  const previous = new Map<number, number | null>([[fromModuleId, null]]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) break;
    if (currentId === targetModuleId) break;
    const current = byId.get(currentId);
    if (!current) continue;

    modules.forEach((candidate) => {
      if (
        previous.has(candidate.id) ||
        !isWalkable(candidate, targetModuleId) ||
        !areModulesAdjacent(current, candidate)
      ) {
        return;
      }
      previous.set(candidate.id, currentId);
      queue.push(candidate.id);
    });
  }

  if (!previous.has(targetModuleId)) return null;
  const path: number[] = [];
  for (let id: number | null = targetModuleId; id !== null; id = previous.get(id) ?? null) {
    path.unshift(id);
  }
  return path;
};

type Candidate = {
  crewId: number;
  moduleId: number;
  task: CrewAutomationTask;
  priority: number;
  score: number;
  nextModuleId: number | null;
};

/** Matches the most specialists possible, then maximizes their total priority score. */
const selectUniqueCandidates = (candidates: Candidate[]): Candidate[] => {
  const crewIds = [...new Set(candidates.map((candidate) => candidate.crewId))];
  const moduleIds = [...new Set(candidates.map((candidate) => candidate.moduleId))];
  if (crewIds.length === 0 || moduleIds.length === 0) return [];

  const candidateKey = (crewId: number, moduleId: number) => `${crewId}:${moduleId}`;
  const candidatesByKey = new Map(
    candidates.map((candidate) => [candidateKey(candidate.crewId, candidate.moduleId), candidate]),
  );
  const matchBonus = candidates.reduce((sum, candidate) => sum + Math.abs(candidate.score), 0) + 1;
  const forbiddenCost = matchBonus * 2 + 1;
  const columnCount = moduleIds.length + crewIds.length;
  const costs = crewIds.map((crewId) =>
    Array.from({ length: columnCount }, (_, index) => {
      if (index >= moduleIds.length) return 0;
      const candidate = candidatesByKey.get(candidateKey(crewId, moduleIds[index]));
      return candidate ? -(matchBonus + candidate.score) : forbiddenCost;
    }),
  );

  // Dummy columns allow a specialist to remain unassigned without occupying a real module.
  const u = Array<number>(crewIds.length + 1).fill(0);
  const v = Array<number>(columnCount + 1).fill(0);
  const matchedRowsByColumn = Array<number>(columnCount + 1).fill(0);
  const previousColumn = Array<number>(columnCount + 1).fill(0);

  for (let row = 1; row <= crewIds.length; row += 1) {
    matchedRowsByColumn[0] = row;
    let column = 0;
    const minimumCosts = Array<number>(columnCount + 1).fill(Infinity);
    const usedColumns = Array<boolean>(columnCount + 1).fill(false);

    do {
      usedColumns[column] = true;
      const currentRow = matchedRowsByColumn[column];
      let delta = Infinity;
      let nextColumn = 0;

      for (let candidateColumn = 1; candidateColumn <= columnCount; candidateColumn += 1) {
        if (usedColumns[candidateColumn]) continue;
        const cost = costs[currentRow - 1][candidateColumn - 1] - u[currentRow] - v[candidateColumn];
        if (cost < minimumCosts[candidateColumn]) {
          minimumCosts[candidateColumn] = cost;
          previousColumn[candidateColumn] = column;
        }
        if (minimumCosts[candidateColumn] < delta) {
          delta = minimumCosts[candidateColumn];
          nextColumn = candidateColumn;
        }
      }

      for (let candidateColumn = 0; candidateColumn <= columnCount; candidateColumn += 1) {
        if (usedColumns[candidateColumn]) {
          u[matchedRowsByColumn[candidateColumn]] += delta;
          v[candidateColumn] -= delta;
        } else {
          minimumCosts[candidateColumn] -= delta;
        }
      }
      column = nextColumn;
    } while (matchedRowsByColumn[column] !== 0);

    do {
      const nextColumn = previousColumn[column];
      matchedRowsByColumn[column] = matchedRowsByColumn[nextColumn];
      column = nextColumn;
    } while (column !== 0);
  }

  return moduleIds.flatMap((moduleId, index) => {
    const row = matchedRowsByColumn[index + 1] - 1;
    const candidate = row >= 0
      ? candidatesByKey.get(candidateKey(crewIds[row], moduleId))
      : undefined;
    return candidate ? [candidate] : [];
  });
};

export const planCrewAutomation = ({
  crew,
  modules,
  mode,
  memory,
  hasActiveResearch,
  passiveRegenByCrew = {},
  mergeableModuleIds,
  enabled = true,
}: CrewAutomationInput): CrewAutomationPlan => {
  if (!enabled) return { decisions: [], memory };

  const decisions = new Map<number, CrewAutomationDecision>();
  const assign = (candidate: Candidate) => {
    if (decisions.has(candidate.crewId)) return;
    decisions.set(candidate.crewId, {
      crewId: candidate.crewId,
      targetModuleId: candidate.moduleId,
      nextModuleId: candidate.nextModuleId,
      task: candidate.task,
      priority: candidate.priority,
    });
  };
  const candidatesFor = (
    members: CrewMember[],
    targetModules: Module[],
    task: CrewAutomationTask,
    priority: number,
    scarce = false,
  ) => {
    const candidates: Candidate[] = [];
    const levelWeight = scarce ? 1_000 : 0;
    members.forEach((member) => {
      targetModules.forEach((target) => {
        if (
          isCritical(target) &&
          (member.profession !== "engineer" || task !== "repair")
        ) {
          return;
        }
        const path = getPath(modules, member.moduleId, target.id);
        if (!path) return;
        const attachment = memory[member.id];
        const attachmentScore =
          attachment?.mode === mode && attachment.targetModuleId === target.id
            ? Math.min(attachment.turnsAtTarget, 3) * 15
            : 0;
        candidates.push({
          crewId: member.id,
          moduleId: target.id,
          task,
          priority,
          nextModuleId: path[1] ?? null,
          score:
            attachmentScore +
            (target.level ?? 1) -
            (path.length - 1) * 100 -
            getNegativeMoralePenalty(crew, target.id, member.id) +
            member.level * levelWeight,
        });
      });
    });
    return candidates;
  };
  const unassigned = (profession?: CrewMember["profession"]) =>
    crew.filter(
      (member) =>
        !decisions.has(member.id) &&
        (!profession || member.profession === profession) &&
        !(member.race === "xenosymbiont" && member.isMerged),
    );
  const activeModules = modules.filter(isActive);

  // 1. Non-engineers leave modules whose critical damage exceeds all known healing.
  crew.forEach((member) => {
    if (member.profession === "engineer" || member.isMerged) return;
    const current = modules.find((module) => module.id === member.moduleId);
    if (!current || !isCritical(current)) return;
    const externalHealing = crew
      .filter(
        (other) =>
          other.id !== member.id &&
          other.moduleId === current.id &&
          (other.assignment === "heal" || other.combatAssignment === "heal"),
      )
      .reduce((best, medic) => Math.max(best, 20 + Math.max(medic.level - 1, 0)), 0);
    const healing =
      (passiveRegenByCrew[member.id] ?? 0) + getMedicalHealing(current) + externalHealing;
    if (getCriticalDamage(current) <= healing) return;

    const safeModules = activeModules.filter(
      (module) => module.id !== current.id && !isCritical(module),
    );
    const best = candidatesFor([member], safeModules, null, PRIORITY.safety)
      .sort((left, right) => {
        const leftModule = modules.find((module) => module.id === left.moduleId);
        const rightModule = modules.find((module) => module.id === right.moduleId);
        const leftSafety = (leftModule?.defense ?? 0) + getMedicalHealing(leftModule ?? current) * 5;
        const rightSafety = (rightModule?.defense ?? 0) + getMedicalHealing(rightModule ?? current) * 5;
        return rightSafety - leftSafety || right.score - left.score;
      })[0];
    if (best) assign(best);
  });

  // 2. Repairs use one engineer per module, with destroyed modules first.
  const repairStages = [
    modules.filter((module) => !module.manualDisabled && module.health <= 0),
    modules.filter((module) => !module.manualDisabled && module.health > 0 && isCritical(module)),
    modules.filter((module) => isActive(module) && isDamaged(module)),
  ];
  const repairPriorities = [PRIORITY.brokenRepair, PRIORITY.criticalRepair, PRIORITY.work];
  repairStages.forEach((targets, index) => {
    selectUniqueCandidates(
      candidatesFor(unassigned("engineer"), targets, "repair", repairPriorities[index]),
    ).forEach(assign);
  });

  // 3. Medics secure the most injured crew before any morale task.
  const injuredModules = [...new Set(
    crew
      .filter((member) => member.health < member.maxHealth)
      .map((member) => member.moduleId),
  )]
    .map((moduleId) => modules.find((module) => module.id === moduleId))
    .filter((module): module is Module => Boolean(module));
  const medicTask = mode === "combat" ? "heal" : "heal";
  selectUniqueCandidates(
    candidatesFor(unassigned("medic"), injuredModules, medicTask, PRIORITY.healing),
  ).forEach(assign);

  // 4. Exclusive professional roles.
  const gunnerTask = mode === "combat" ? "targeting" : "training";
  const weaponBays = activeModules.filter((module) => module.type === "weaponbay");
  selectUniqueCandidates(
    candidatesFor(
      unassigned("gunner"),
      weaponBays,
      gunnerTask,
      PRIORITY.role,
      unassigned("gunner").length > weaponBays.length,
    ),
  ).forEach(assign);
  if (mode === "combat") {
    const pointDefense = activeModules.filter((module) => module.type === "point_defense");
    selectUniqueCandidates(
      candidatesFor(unassigned("gunner"), pointDefense, "interception", PRIORITY.role),
    ).forEach(assign);
  }

  const cockpits = activeModules.filter((module) => module.type === "cockpit");
  selectUniqueCandidates(
    candidatesFor(
      unassigned("pilot"),
      cockpits,
      mode === "combat" ? "evasion" : "navigation",
      PRIORITY.role,
    ),
  ).forEach(assign);

  const labs = activeModules.filter((module) => LAB_MODULE_TYPES.has(module.type));
  if (mode === "civilian" && hasActiveResearch) {
    const researchScientists = unassigned("scientist");
    selectUniqueCandidates(
      candidatesFor(
        researchScientists,
        labs,
        "research",
        PRIORITY.role,
        researchScientists.length > labs.length,
      ),
    ).forEach(assign);
  }
  if (mode === "civilian") {
    const scannerTargets = activeModules.filter((module) => module.type === "scanner");
    const analyzingScientists = unassigned("scientist");
    selectUniqueCandidates(
      candidatesFor(
        analyzingScientists,
        scannerTargets,
        "analyzing",
        PRIORITY.role,
        analyzingScientists.length > scannerTargets.length,
      ),
    ).forEach(assign);
  }
  if (
    mode === "combat" &&
    [...decisions.values()].some((decision) => decision.task === "targeting")
  ) {
    selectUniqueCandidates(
      candidatesFor(unassigned("scientist"), activeModules, "analysis", PRIORITY.role),
    ).forEach(assign);
  }

  const reactorTargets = activeModules.filter((module) => module.type === "reactor");
  if (mode === "civilian") {
    selectUniqueCandidates(
      candidatesFor(unassigned("engineer"), reactorTargets, "reactor_overload", PRIORITY.work),
    ).forEach(assign);
  } else {
    selectUniqueCandidates(
      candidatesFor(unassigned("engineer"), weaponBays, "calibration", PRIORITY.work),
    ).forEach(assign);
  }

  const moraleTargets = [...new Set(crew.map((member) => member.moduleId))]
    .map((moduleId) => modules.find((module) => module.id === moduleId))
    .filter((module): module is Module => Boolean(module && isActive(module)))
    .sort((left, right) => {
      const leftMorale = crew
        .filter((member) => member.moduleId === left.id)
        .reduce((sum, member) => sum + member.happiness / Math.max(member.maxHappiness, 1), 0);
      const rightMorale = crew
        .filter((member) => member.moduleId === right.id)
        .reduce((sum, member) => sum + member.happiness / Math.max(member.maxHappiness, 1), 0);
      return leftMorale - rightMorale;
    });
  selectUniqueCandidates(
    candidatesFor(unassigned("medic"), moraleTargets, mode === "combat" ? "firstaid" : "morale", PRIORITY.work),
  ).forEach(assign);

  const scoutTask = mode === "combat" ? "sabotage" : "patrol";
  unassigned("scout").forEach((member) => {
    const candidate = candidatesFor([member], activeModules, scoutTask, PRIORITY.work)
      .sort((left, right) => right.score - left.score)[0];
    if (candidate) assign(candidate);
  });

  // 5. A free xenosymbiont merges only after its normal profession had no slot.
  unassigned().forEach((member) => {
    if (member.race !== "xenosymbiont") return;
    const occupiedMergeIds = new Set(
      crew.filter((other) => other.isMerged).map((other) => other.mergedModuleId),
    );
    decisions.forEach((decision) => {
      if (decision.task === "merge") occupiedMergeIds.add(decision.targetModuleId);
    });
    const mergePriority = (module: Module) => {
      if (mode === "combat") {
        if (module.type === "weaponbay") return 7;
        if (module.type === "point_defense") return 6;
        if (module.type === "shield") return 5;
        if (MEDICAL_MODULE_TYPES.has(module.type) || module.type === "lifesupport") return 4;
        if (module.type === "cockpit") return 3;
        return 1;
      }
      if (module.type === "reactor") return 7;
      if (LAB_MODULE_TYPES.has(module.type)) return 6;
      if (module.type === "scanner" || module.type === "deep_survey_array") return 5;
      if (MEDICAL_MODULE_TYPES.has(module.type)) return 4;
      if (module.type === "weaponbay") return 3;
      return 1;
    };
    const mergeTargets = activeModules
      .filter(
        (module) =>
          module.type !== "weaponShed" &&
          !occupiedMergeIds.has(module.id) &&
          (!mergeableModuleIds || mergeableModuleIds.includes(module.id)),
      )
      .sort((left, right) => mergePriority(right) - mergePriority(left));
    const candidate = candidatesFor([member], mergeTargets, "merge", PRIORITY.rest)
      .sort((left, right) => {
        const leftModule = modules.find((module) => module.id === left.moduleId);
        const rightModule = modules.find((module) => module.id === right.moduleId);
        return (
          mergePriority(rightModule ?? modules[0]) - mergePriority(leftModule ?? modules[0]) ||
          right.score - left.score
        );
      })[0];
    if (candidate) assign(candidate);
  });

  // 6. Idle crew rests in a healing or defensible active module.
  unassigned().forEach((member) => {
    const fallbackTargets = activeModules
      .filter((module) => REST_MODULE_TYPES.has(module.type) || mode === "combat")
      .sort((left, right) => {
        const safety = (module: Module) =>
          getMedicalHealing(module) * 10 + (module.defense ?? 0) + (module.level ?? 1);
        return safety(right) - safety(left);
      });
    const candidate = candidatesFor([member], fallbackTargets, null, PRIORITY.rest)
      .sort((left, right) => right.score - left.score)[0];
    if (candidate) assign(candidate);
  });

  crew.forEach((member) => {
    if (decisions.has(member.id) || member.isMerged) return;
    decisions.set(member.id, {
      crewId: member.id,
      targetModuleId: member.moduleId,
      nextModuleId: null,
      task: null,
      priority: PRIORITY.rest,
    });
  });

  const nextMemory: CrewAutomationMemory = {};
  decisions.forEach((decision) => {
    const previous = memory[decision.crewId];
    const isAtTarget = crew.find((member) => member.id === decision.crewId)?.moduleId === decision.targetModuleId;
    const unchanged =
      previous?.targetModuleId === decision.targetModuleId &&
      previous.task === decision.task &&
      previous.mode === mode;
    nextMemory[decision.crewId] = {
      targetModuleId: decision.targetModuleId,
      task: decision.task,
      mode,
      turnsAtTarget: isAtTarget
        ? unchanged
          ? Math.min(previous.turnsAtTarget + 1, 3)
          : 1
        : 0,
    };
  });

  return { decisions: [...decisions.values()], memory: nextMemory };
};
