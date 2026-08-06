import { calculateHealthRegen } from "./calculateHealthRegen";
import { canMergeWithModule } from "./merge";
import { planCrewAutomation } from "./crewAutomation";
import { isValidCrewAssignment } from "./validateAssignment";
import type {
  CrewMemberAssignment,
  CrewMemberCombatAssignment,
  GameStore,
  SetState,
} from "@/game/types";

export const runCrewAutomation = (
  set: SetState,
  get: () => GameStore,
): void => {
  const state = get();
  if (!state.crewAutomation.enabled) return;

  const mode = state.currentCombat ? "combat" : "civilian";
  const plan = planCrewAutomation({
    crew: state.crew,
    modules: state.ship.modules,
    mode,
    memory: state.crewAutomation.memory,
    hasActiveResearch: state.research.activeResearch !== null,
    currentLocationType: state.currentLocation?.type ?? null,
    passiveRegenByCrew: Object.fromEntries(
      state.crew.map((member) => [member.id, calculateHealthRegen(member, state)]),
    ),
    mergeableModuleIds: state.ship.modules
      .filter((module) =>
        state.crew.some((member) => canMergeWithModule(member, module)),
      )
      .map((module) => module.id),
  });

  const decisions = new Map(plan.decisions.map((decision) => [decision.crewId, decision]));
  set((draft) => ({
    crew: draft.crew.map((member) => {
      const decision = decisions.get(member.id);
      if (!decision) return member;

      if (decision.nextModuleId !== null) {
        if (member.movedThisTurn) {
          return {
            ...member,
            assignment: null,
            assignmentEffect: null,
            combatAssignment: null,
            combatAssignmentEffect: null,
          };
        }
        return {
          ...member,
          moduleId: decision.nextModuleId,
          movedThisTurn: true,
          assignment: null,
          assignmentEffect: null,
          combatAssignment: null,
          combatAssignmentEffect: null,
        };
      }

      const currentModule = draft.ship.modules.find(
        (module) => module.id === member.moduleId,
      );
      const task =
        currentModule && decision.task
          ? isValidCrewAssignment(member, currentModule, decision.task, mode).valid
            ? decision.task
            : null
          : null;

      if (mode === "combat") {
        return {
          ...member,
          combatAssignment: task as CrewMemberCombatAssignment,
          combatAssignmentEffect: null,
        };
      }
      return {
        ...member,
        assignment: task as CrewMemberAssignment,
        assignmentEffect: null,
      };
    }),
    crewAutomation: { ...draft.crewAutomation, memory: plan.memory },
  }));
};
