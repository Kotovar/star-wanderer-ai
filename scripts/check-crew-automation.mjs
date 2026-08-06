import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const { planCrewAutomation } = await import(
  "../src/game/slices/crew/helpers/crewAutomation.ts"
).catch(() => ({}));

assert.equal(
  typeof planCrewAutomation,
  "function",
  "crew automation planner must be exported",
);

const assignmentsPanelSource = await readFile(
  new URL("../src/game/components/AssignmentsPanel.tsx", import.meta.url),
  "utf8",
);

assert.match(
  assignmentsPanelSource,
  /if \(crewAutomationEnabled\) \{\s+closeAssignments\(\);\s+return;\s+\}/,
  "automation Apply closes the assignments panel",
);
assert.match(
  assignmentsPanelSource,
  /readOnly && \(\s+<span[^>]*>\s+\{t\("assignments_panel\.automation_toggle"\)\}/,
  "automated crew card has an explicit status badge",
);

const shipModule = (id, type, x, y, overrides = {}) => ({
  id,
  type,
  name: `${type}-${id}`,
  x,
  y,
  width: 1,
  height: 1,
  health: 100,
  maxHealth: 100,
  level: 1,
  ...overrides,
});

const crewMember = (id, profession, moduleId, overrides = {}) => ({
  id,
  name: `${profession}-${id}`,
  race: "human",
  profession,
  moduleId,
  level: 1,
  health: 100,
  maxHealth: 100,
  happiness: 100,
  maxHappiness: 100,
  turnsAtZeroHappiness: 0,
  assignment: null,
  assignmentEffect: null,
  combatAssignment: null,
  combatAssignmentEffect: null,
  traits: [],
  movedThisTurn: false,
  isMerged: false,
  mergedModuleId: null,
  firstaidActive: false,
  augmentation: null,
  ...overrides,
});

const decide = (crew, modules, overrides = {}) => {
  const plan = planCrewAutomation({
    crew,
    modules,
    mode: "civilian",
    memory: {},
    hasActiveResearch: false,
    currentLocationType: null,
    ...overrides,
  });
  return new Map(plan.decisions.map((decision) => [decision.crewId, decision]));
};

{
  const plan = planCrewAutomation({
    crew: [crewMember(1, "gunner", 1)],
    modules: [shipModule(1, "cockpit", 0, 0)],
    mode: "civilian",
    memory: {},
    hasActiveResearch: false,
    currentLocationType: null,
    enabled: false,
  });
  assert.deepEqual(plan.decisions, [], "disabled automation does not issue decisions");
}

{
  const modules = [
    shipModule(1, "cockpit", 0, 0),
    shipModule(2, "weaponbay", 1, 0),
    shipModule(3, "weaponbay", 1, 1),
    shipModule(4, "medical", 0, 1),
  ];
  const decisions = decide(
    [crewMember(1, "gunner", 1), crewMember(2, "gunner", 4)],
    modules,
  );
  assert.equal(decisions.get(1)?.targetModuleId, 2, "first gunner takes nearest bay");
  assert.equal(decisions.get(2)?.targetModuleId, 3, "second gunner takes the other nearest bay");
}

{
  const modules = [
    shipModule(1, "cockpit", 0, 0),
    shipModule(2, "weaponbay", 1, 0, { level: 1 }),
    shipModule(3, "weaponbay", 0, 1, { level: 3 }),
  ];
  const decisions = decide([crewMember(1, "gunner", 1)], modules);
  assert.equal(decisions.get(1)?.targetModuleId, 3, "module level breaks equal role and distance choices");
}

{
  const modules = [shipModule(1, "cockpit", 0, 0), shipModule(2, "weaponbay", 1, 0)];
  const decisions = decide(
    [crewMember(1, "gunner", 1, { level: 2 }), crewMember(2, "gunner", 1, { level: 5 })],
    modules,
  );
  assert.equal(decisions.get(2)?.targetModuleId, 2, "highest-level gunner wins a scarce bay");
  assert.notEqual(decisions.get(1)?.targetModuleId, 2, "scarce bay has one gunner");
}

{
  const modules = [
    shipModule(1, "cockpit", 0, 0),
    shipModule(2, "weaponbay", 1, 0, { health: 0 }),
    shipModule(3, "reactor", 0, 1, { health: 70 }),
  ];
  const decisions = decide(
    [crewMember(1, "engineer", 1), crewMember(2, "engineer", 3)],
    modules,
  );
  assert.equal(decisions.get(1)?.targetModuleId, 2, "engineer prioritizes a broken module");
  assert.equal(decisions.get(2)?.targetModuleId, 3, "engineers split repair targets");
}

{
  const modules = [
    shipModule(1, "medical", 0, 0),
    shipModule(2, "weaponbay", 1, 0),
  ];
  const decisions = decide(
    [crewMember(1, "medic", 1), crewMember(2, "gunner", 2, { health: 80 })],
    modules,
  );
  assert.equal(decisions.get(1)?.targetModuleId, 2, "medic goes to injured crew before morale work");
  assert.equal(decisions.get(1)?.task, "heal", "medic selects healing");
}

{
  const modules = [
    shipModule(1, "weaponbay", 0, 0, { health: 0 }),
    shipModule(2, "medical", 1, 0, { healing: 10 }),
  ];
  const decisions = decide([crewMember(1, "gunner", 1)], modules);
  assert.equal(decisions.get(1)?.targetModuleId, 2, "non-engineer evacuates a broken module");
  assert.equal(decisions.get(1)?.nextModuleId, 2, "evacuation moves one adjacent step");
}

{
  const modules = [
    shipModule(1, "cockpit", 0, 0),
    shipModule(2, "weaponbay", 1, 0, { health: 25 }),
  ];
  const decisions = decide(
    [crewMember(1, "gunner", 1), crewMember(2, "engineer", 1)],
    modules,
  );
  assert.equal(decisions.get(1)?.targetModuleId, 1, "gunner does not return to a critical weapon bay");
  assert.equal(decisions.get(1)?.task, null, "gunner waits outside a critical weapon bay");
  assert.equal(decisions.get(2)?.targetModuleId, 2, "engineer enters a critical module");
  assert.equal(decisions.get(2)?.task, "repair", "engineer enters a critical module only to repair it");
}

{
  const modules = [
    shipModule(1, "cockpit", 0, 0),
    shipModule(2, "weaponbay", 1, 0),
    shipModule(3, "weaponbay", 2, 0),
  ];
  const crew = [crewMember(1, "gunner", 2)];
  const decisions = decide(crew, modules, {
    memory: { 1: { targetModuleId: 2, task: "training", mode: "civilian", turnsAtTarget: 3 } },
  });
  assert.equal(decisions.get(1)?.targetModuleId, 2, "attachment keeps an equal-priority placement");
}

{
  const modules = [
    shipModule(1, "cockpit", 0, 0),
    shipModule(2, "reactor", 1, 0, { health: 95 }),
    shipModule(3, "weaponbay", 2, 0, { health: 0 }),
  ];
  const decisions = decide(
    [crewMember(1, "engineer", 2)],
    modules,
    { memory: { 1: { targetModuleId: 2, task: "repair", mode: "civilian", turnsAtTarget: 3 } } },
  );
  assert.equal(decisions.get(1)?.targetModuleId, 3, "broken repair overrides attachment");
  assert.equal(decisions.get(1)?.nextModuleId, 3, "planner moves one step toward emergency");
}

{
  const modules = [
    shipModule(1, "cockpit", 0, 0),
    shipModule(2, "reactor", 1, 0),
  ];
  const decisions = decide(
    [crewMember(1, "gunner", 1, { race: "xenosymbiont" })],
    modules,
  );
  assert.equal(decisions.get(1)?.targetModuleId, 2, "idle xenosymbiont finds a useful module");
  assert.equal(decisions.get(1)?.task, "merge", "idle xenosymbiont merges instead of waiting");
}

{
  const modules = [
    shipModule(1, "cockpit", 0, 0),
    shipModule(2, "reactor", 1, 0),
  ];
  const decisions = decide([crewMember(1, "engineer", 1)], modules, { mode: "combat" });
  assert.ok(
    [...decisions.values()].every(
      (decision) => decision.task !== "fuel_synthesis" && decision.task !== "vent_fuel",
    ),
    "automation never selects resource-spending tasks",
  );
}

{
  const decisions = decide(
    [crewMember(1, "engineer", 1, { assignment: "fuel_synthesis" })],
    [shipModule(1, "fueltank", 0, 0)],
  );
  assert.equal(decisions.get(1)?.task, null, "automation clears an unsupported old resource task");
}

{
  const modules = [
    shipModule(1, "cockpit", 0, 0),
    shipModule(2, "medical", 1, 0),
    shipModule(3, "weaponbay", 2, 0),
  ];
  const plan = planCrewAutomation({
    crew: [crewMember(1, "gunner", 1)],
    modules,
    mode: "civilian",
    memory: {},
    hasActiveResearch: false,
    currentLocationType: null,
  });
  const decisions = new Map(plan.decisions.map((decision) => [decision.crewId, decision]));
  assert.equal(decisions.get(1)?.targetModuleId, 3, "planner keeps distant role target");
  assert.equal(decisions.get(1)?.nextModuleId, 2, "planner only takes the first route step");
  assert.equal(plan.memory[1]?.turnsAtTarget, 0, "attachment starts only after reaching the target");
}

{
  const modules = [
    shipModule(1, "cockpit", 0, 0),
    shipModule(2, "weaponbay", 1, 0),
    shipModule(3, "lab", 0, 1),
  ];
  const decisions = decide(
    [crewMember(1, "gunner", 1), crewMember(2, "scientist", 3)],
    modules,
    { mode: "combat" },
  );
  assert.equal(decisions.get(1)?.task, "targeting", "combat gunner fills weapon role");
  assert.equal(decisions.get(2)?.task, "analysis", "scientist analyzes only after targeting is staffed");
}

{
  const modules = Array.from({ length: 16 }, (_, index) =>
    shipModule(index + 1, "weaponbay", index, 0),
  );
  const crew = Array.from({ length: 16 }, (_, index) =>
    crewMember(index + 1, "gunner", 1),
  );
  const input = {
    crew,
    modules,
    mode: "civilian",
    memory: {},
    hasActiveResearch: false,
    currentLocationType: null,
  };

  planCrewAutomation(input);
  const startedAt = performance.now();
  const plan = planCrewAutomation(input);
  const elapsed = performance.now() - startedAt;
  const targets = plan.decisions.map((decision) => decision.targetModuleId);

  assert.equal(new Set(targets).size, 16, "large specialist group fills distinct slots");
  assert.ok(elapsed < 250, `large specialist group plans quickly (${elapsed.toFixed(1)} ms)`);
}

console.log("crew automation checks passed");
