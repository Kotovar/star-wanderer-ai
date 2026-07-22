import { store as i18nStore } from "@/lib/useTranslation";
import { isModuleActive } from "@/game/modules";
import type {
  GameState,
  GameStore,
  PendingRandomEvent,
  RandomEventChoiceId,
  RandomEventType,
  SetState,
} from "@/game/types";
import { grantTimedEffect } from "@/game/effects/timedEffects";
import {
  isRandomEventConsequenceDue,
  scheduleRandomEventConsequence,
} from "@/game/events/randomEventChains";
import { pickRandomEvent } from "@/game/constants/randomEvents";
import { shiftHappiness } from "@/game/crew";

// ─── Frequency tuning ─────────────────────────────────────────
const EVENT_TRIGGER_CHANCE = 0.05; // было 0.08
const EVENT_COOLDOWN = 12; // было 8
const FIRST_EVENT_TURN = 6;

// ─── Payload ranges ───────────────────────────────────────────
const STORM_DAMAGE_MIN = 5;
const STORM_DAMAGE_MAX = 15;
const MIN_MODULE_HEALTH = 10;
const CAPSULE_REWARDS_MIN = 20;
const CAPSULE_REWARDS_MAX = 30;
const VIRUS_HAPPINESS_PENALTY = 10;
const FUEL_LEAK_MIN = 8;
const FUEL_LEAK_MAX = 15;
const CREW_DISPUTE_HAPPINESS_PENALTY = 6;
const SPECIALIST_EXP = 4;
const BIOHAZARD_DAMAGE_MIN = 10;
const BIOHAZARD_DAMAGE_MAX = 20;

const METEOR_DAMAGE_MIN = 8;
const METEOR_DAMAGE_MAX = 18;
const PIRATE_CREDIT_LOSS_MIN = 30;
const PIRATE_CREDIT_LOSS_MAX = 60;
const DERELICT_REWARD_MIN = 15;
const DERELICT_REWARD_MAX = 35;
const TRADER_DISCOUNT_MIN = 20;
const TRADER_DISCOUNT_MAX = 40;

type RandomEventState = Pick<GameState, "crew" | "ship">;

const randomInRange = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomElement = <T>(items: T[]): T =>
  items[randomInRange(0, items.length - 1)];

const findLivingCrew = (
  state: RandomEventState,
  profession: GameState["crew"][number]["profession"],
) => state.crew.find((member) => member.profession === profession && member.health > 0);

const findActiveModule = (
  state: RandomEventState,
  type: GameState["ship"]["modules"][number]["type"],
) =>
  state.ship.modules.find(
    (module) => module.type === type && isModuleActive(module),
  );

// ─── Choice availability ──────────────────────────────────────

export function canUseRandomEventChoice(
  state: RandomEventState,
  event: PendingRandomEvent,
  choice: RandomEventChoiceId,
): boolean {
  if (choice === "standard") return true;
  if (event.type === "consequence") return false;

  switch (event.type) {
    case "storm": {
      if (choice === "systems") return state.ship.shields > 0;
      const cockpit = findActiveModule(state, "cockpit");
      const pilot = findLivingCrew(state, "pilot");
      return !!cockpit && pilot?.moduleId === cockpit.id;
    }
    case "capsule":
      if (choice === "specialist") return !!findLivingCrew(state, "scientist");
      return (
        !!findLivingCrew(state, "engineer") &&
        !!findActiveModule(state, "cargo")
      );
    case "virus":
      if (choice === "specialist") return !!findLivingCrew(state, "medic");
      return (
        state.crew.some(
          (member) => member.race === "synthetic" && member.health > 0,
        ) || !!findActiveModule(state, "ai_core")
      );
    case "fuel_leak":
      if (choice === "specialist") return !!findLivingCrew(state, "engineer");
      return !!findActiveModule(state, "repair_bay");
    case "crew_dispute":
      if (choice === "specialist") return !!findLivingCrew(state, "pilot");
      return !!findActiveModule(state, "quarters");
    case "biohazard":
      if (choice === "specialist") return !!findLivingCrew(state, "medic");
      return !!findActiveModule(state, "lifesupport");
    case "meteor_shower":
      if (choice === "systems") return state.ship.shields > 0;
      return !!findLivingCrew(state, "engineer");
    case "pirate_raid":
      if (choice === "systems")
        return !!findActiveModule(state, "weaponbay");
      return !!findLivingCrew(state, "gunner");
    case "distress_signal":
      if (choice === "specialist") return !!findLivingCrew(state, "medic");
      return !!findActiveModule(state, "medical");
    case "trader":
      if (choice === "specialist") return !!findLivingCrew(state, "scientist");
      return !!findActiveModule(state, "cargo");
    case "derelict":
      if (choice === "specialist") return !!findLivingCrew(state, "scientist");
      return !!findActiveModule(state, "scanner");
    case "ancient_signal":
      if (choice === "specialist") {
        const lab = findActiveModule(state, "lab");
        const scientist = findLivingCrew(state, "scientist");
        return !!lab && scientist?.moduleId === lab.id;
      }
      return !!findActiveModule(state, "scanner");
    case "research_breakthrough":
      if (choice === "specialist") {
        const lab = findActiveModule(state, "lab");
        const scientist = findLivingCrew(state, "scientist");
        return !!lab && scientist?.moduleId === lab.id;
      }
      return !!findActiveModule(state, "scanner");
    case "artifact_resonance":
      if (choice === "specialist") return !!findLivingCrew(state, "scientist");
      return !!findActiveModule(state, "lab");
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function changeCrewHappiness(set: SetState, amount: number): void {
  set((state) => ({
    crew: state.crew.map((member) => shiftHappiness(member, amount)),
  }));
}

function damageModule(set: SetState, moduleId: number, damage: number): void {
  if (damage <= 0) return;
  set((state) => ({
    ship: {
      ...state.ship,
      modules: state.ship.modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              health: Math.max(MIN_MODULE_HEALTH, module.health - damage),
            }
          : module,
      ),
    },
  }));
}

function addResearchResource(
  set: SetState,
  resource: string,
  amount: number,
): void {
  set((state) => ({
    research: {
      ...state.research,
      resources: {
        ...state.research.resources,
        [resource]:
          ((state.research.resources as Record<string, number>)[resource] ??
            0) + amount,
      },
    },
  }));
}

// ─── Consequence handler ──────────────────────────────────────

function applyRandomEventConsequence(
  event: Extract<PendingRandomEvent, { type: "consequence" }>,
  set: SetState,
  get: () => GameStore,
): void {
  const positive = event.choice !== "standard";

  switch (event.eventType) {
    case "storm":
    case "virus":
    case "crew_dispute":
    case "biohazard":
      changeCrewHappiness(
        set,
        positive ? 3 : event.eventType === "biohazard" ? -3 : -2,
      );
      break;
    case "capsule":
      if (event.choice === "specialist")
        addResearchResource(set, "ancient_data", 1);
      else if (event.choice === "systems")
        addResearchResource(set, "tech_salvage", 1);
      else set((state) => ({ credits: state.credits + 10 }));
      break;
    case "fuel_leak":
      if (positive)
        set((state) => ({
          ship: {
            ...state.ship,
            fuel: Math.min(state.ship.maxFuel, state.ship.fuel + 4),
          },
        }));
      else
        set((state) => ({
          ship: { ...state.ship, fuel: Math.max(0, state.ship.fuel - 3) },
        }));
      break;
    case "meteor_shower":
      changeCrewHappiness(set, positive ? 2 : -2);
      break;
    case "pirate_raid":
      if (event.choice === "specialist")
        set((state) => ({ credits: state.credits + 20 }));
      else if (event.choice === "standard")
        set((state) => ({ credits: Math.max(0, state.credits - 10) }));
      break;
    case "distress_signal":
      changeCrewHappiness(set, positive ? 3 : -2);
      break;
    case "trader":
      if (event.choice === "specialist")
        addResearchResource(set, "tech_salvage", 1);
      else if (event.choice === "systems")
        set((state) => ({ credits: state.credits + 15 }));
      break;
    case "derelict":
      if (event.choice === "specialist")
        addResearchResource(set, "ancient_data", 1);
      else if (event.choice === "systems")
        addResearchResource(set, "tech_salvage", 1);
      else set((state) => ({ credits: state.credits + 10 }));
      break;
    case "ancient_signal":
      if (event.choice === "specialist")
        addResearchResource(set, "ancient_data", 1);
      else if (event.choice === "systems")
        addResearchResource(set, "tech_salvage", 1);
      break;
    case "research_breakthrough":
      if (event.choice === "specialist")
        addResearchResource(set, "ancient_data", 1);
      else if (event.choice === "systems")
        addResearchResource(set, "tech_salvage", 1);
      break;
    case "artifact_resonance":
      if (event.choice === "specialist")
        addResearchResource(set, "ancient_data", 1);
      else if (event.choice === "systems")
        addResearchResource(set, "tech_salvage", 1);
      else changeCrewHappiness(set, 1);
      break;
  }

  get().addLog(
    i18nStore.t(
      `random_events.consequence.${event.eventType}.${event.choice}`,
    ),
    positive ? "info" : "warning",
  );
}

// ─── Per-event choice handlers (existing) ─────────────────────

function applyStormChoice(
  event: Extract<PendingRandomEvent, { type: "storm" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    const reducedDamage = Math.max(1, Math.ceil(event.damage * 0.35));
    damageModule(set, event.targetModuleId, reducedDamage);
    get().gainExp(findLivingCrew(get(), "pilot"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.storm_pilot", { damage: reducedDamage }),
      "info",
    );
    return;
  }

  if (choice === "systems") {
    const shields = get().ship.shields;
    const absorbed = Math.min(shields, event.damage);
    const remainingDamage = event.damage - absorbed;
    set((state) => ({
      ship: {
        ...state.ship,
        shields: Math.max(0, state.ship.shields - absorbed),
      },
    }));
    damageModule(set, event.targetModuleId, remainingDamage);
    get().addLog(
      i18nStore.t("random_events.logs.storm_shields", {
        absorbed,
        damage: remainingDamage,
      }),
      remainingDamage > 0 ? "warning" : "info",
    );
    return;
  }

  damageModule(set, event.targetModuleId, event.damage);
  get().addLog(
    i18nStore.t("random_events.logs.storm_standard", {
      damage: event.damage,
    }),
    "warning",
  );
}

function applyCapsuleChoice(
  event: Extract<PendingRandomEvent, { type: "capsule" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    addResearchResource(set, "ancient_data", 1);
    get().gainExp(findLivingCrew(get(), "scientist"), SPECIALIST_EXP);
    get().addLog(i18nStore.t("random_events.logs.capsule_science"), "info");
    return;
  }

  if (choice === "systems") {
    addResearchResource(set, "tech_salvage", 2);
    get().gainExp(findLivingCrew(get(), "engineer"), SPECIALIST_EXP);
    get().addLog(i18nStore.t("random_events.logs.capsule_salvage"), "info");
    return;
  }

  set((state) => ({ credits: state.credits + event.reward }));
  get().addLog(
    i18nStore.t("random_events.logs.capsule_standard", {
      reward: event.reward,
    }),
    "info",
  );
}

function applyVirusChoice(
  event: Extract<PendingRandomEvent, { type: "virus" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    const reducedPenalty = 2;
    changeCrewHappiness(set, -reducedPenalty);
    get().gainExp(findLivingCrew(get(), "medic"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.virus_medic", {
        penalty: reducedPenalty,
      }),
      "info",
    );
    return;
  }

  if (choice === "systems") {
    const aiCore = findActiveModule(get(), "ai_core");
    if (aiCore) {
      damageModule(set, aiCore.id, 5);
    } else {
      const synthetic = get().crew.find(
        (member) => member.race === "synthetic" && member.health > 0,
      );
      if (synthetic) {
        set((state) => ({
          crew: state.crew.map((member) =>
            member.id === synthetic.id
              ? { ...member, health: Math.max(1, member.health - 5) }
              : member,
          ),
        }));
      }
    }
    get().addLog(i18nStore.t("random_events.logs.virus_purge"), "warning");
    return;
  }

  changeCrewHappiness(set, -event.happinessPenalty);
  get().addLog(
    i18nStore.t("random_events.logs.virus_standard", {
      penalty: event.happinessPenalty,
    }),
    "error",
  );
}

function applyFuelLeakChoice(
  event: Extract<PendingRandomEvent, { type: "fuel_leak" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    const reducedLoss = Math.max(1, Math.ceil(event.fuelLoss * 0.25));
    set((state) => ({
      ship: { ...state.ship, fuel: Math.max(0, state.ship.fuel - reducedLoss) },
    }));
    get().gainExp(findLivingCrew(get(), "engineer"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.fuel_leak_engineer", {
        loss: reducedLoss,
      }),
      "info",
    );
    return;
  }

  if (choice === "systems") {
    const repairBay = findActiveModule(get(), "repair_bay");
    if (repairBay) damageModule(set, repairBay.id, 5);
    get().addLog(i18nStore.t("random_events.logs.fuel_leak_drones"), "warning");
    return;
  }

  set((state) => ({
    ship: { ...state.ship, fuel: Math.max(0, state.ship.fuel - event.fuelLoss) },
  }));
  get().addLog(
    i18nStore.t("random_events.logs.fuel_leak_standard", {
      loss: event.fuelLoss,
    }),
    "warning",
  );
}

function applyCrewDisputeChoice(
  event: Extract<PendingRandomEvent, { type: "crew_dispute" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "systems") {
    get().addLog(
      i18nStore.t("random_events.logs.crew_dispute_quarters"),
      "info",
    );
    return;
  }

  const penalty = choice === "specialist" ? 2 : event.happinessPenalty;
  changeCrewHappiness(set, -penalty);

  if (choice === "specialist") {
    get().gainExp(findLivingCrew(get(), "pilot"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.crew_dispute_captain", { penalty }),
      "info",
    );
    return;
  }

  get().addLog(
    i18nStore.t("random_events.logs.crew_dispute_standard", { penalty }),
    "warning",
  );
}

function applyBiohazardChoice(
  event: Extract<PendingRandomEvent, { type: "biohazard" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "systems") {
    const lifesupport = findActiveModule(get(), "lifesupport");
    if (lifesupport) damageModule(set, lifesupport.id, 5);
    get().addLog(i18nStore.t("random_events.logs.biohazard_systems"), "info");
    return;
  }

  if (choice === "specialist") {
    const damage = Math.floor(event.crewDamage * 0.3);
    set((state) => ({
      crew: state.crew.map((member) => ({
        ...member,
        health: Math.max(1, member.health - damage),
      })),
    }));
    get().gainExp(findLivingCrew(get(), "medic"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.biohazard_specialist", { damage }),
      "info",
    );
    return;
  }

  set((state) => ({
    crew: state.crew.map((member) =>
      shiftHappiness(
        { ...member, health: Math.max(1, member.health - event.crewDamage) },
        -5,
      ),
    ),
  }));
  get().addLog(
    i18nStore.t("random_events.logs.biohazard_standard", {
      damage: event.crewDamage,
    }),
    "error",
  );
}

// ─── Per-event choice handlers (new) ──────────────────────────

function applyMeteorShowerChoice(
  event: Extract<PendingRandomEvent, { type: "meteor_shower" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    const reducedDamage = Math.max(1, Math.ceil(event.damage * 0.3));
    damageModule(set, event.targetModuleId, reducedDamage);
    get().gainExp(findLivingCrew(get(), "engineer"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.meteor_shower_engineer", {
        damage: reducedDamage,
      }),
      "info",
    );
    return;
  }

  if (choice === "systems") {
    const shields = get().ship.shields;
    const absorbed = Math.min(shields, event.damage);
    const remainingDamage = event.damage - absorbed;
    set((state) => ({
      ship: {
        ...state.ship,
        shields: Math.max(0, state.ship.shields - absorbed),
      },
    }));
    damageModule(set, event.targetModuleId, remainingDamage);
    get().addLog(
      i18nStore.t("random_events.logs.meteor_shower_shields", {
        absorbed,
        damage: remainingDamage,
      }),
      remainingDamage > 0 ? "warning" : "info",
    );
    return;
  }

  damageModule(set, event.targetModuleId, event.damage);
  get().addLog(
    i18nStore.t("random_events.logs.meteor_shower_standard", {
      damage: event.damage,
    }),
    "warning",
  );
}

function applyPirateRaidChoice(
  event: Extract<PendingRandomEvent, { type: "pirate_raid" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    const loot = Math.floor(event.creditLoss * 0.5);
    set((state) => ({ credits: state.credits + loot }));
    get().gainExp(findLivingCrew(get(), "gunner"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.pirate_raid_gunner", { loot }),
      "info",
    );
    return;
  }

  if (choice === "systems") {
    get().addLog(i18nStore.t("random_events.logs.pirate_raid_scared"), "info");
    return;
  }

  set((state) => ({
    credits: Math.max(0, state.credits - event.creditLoss),
  }));
  changeCrewHappiness(set, -3);
  get().addLog(
    i18nStore.t("random_events.logs.pirate_raid_standard", {
      loss: event.creditLoss,
    }),
    "error",
  );
}

function applyDistressSignalChoice(
  _event: Extract<PendingRandomEvent, { type: "distress_signal" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    set((state) => ({ credits: state.credits + 40 }));
    changeCrewHappiness(set, 5);
    get().gainExp(findLivingCrew(get(), "medic"), SPECIALIST_EXP);
    get().addLog(i18nStore.t("random_events.logs.distress_signal_medic"), "info");
    return;
  }

  if (choice === "systems") {
    changeCrewHappiness(set, 3);
    get().addLog(
      i18nStore.t("random_events.logs.distress_signal_medical"),
      "info",
    );
    return;
  }

  changeCrewHappiness(set, -3);
  get().addLog(
    i18nStore.t("random_events.logs.distress_signal_standard"),
    "warning",
  );
}

function applyTraderChoice(
  event: Extract<PendingRandomEvent, { type: "trader" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    addResearchResource(set, "ancient_data", 1);
    get().gainExp(findLivingCrew(get(), "scientist"), SPECIALIST_EXP);
    get().addLog(i18nStore.t("random_events.logs.trader_scientist"), "info");
    return;
  }

  if (choice === "systems") {
    set((state) => ({
      ship: {
        ...state.ship,
        fuel: Math.min(state.ship.maxFuel, state.ship.fuel + 5),
      },
      credits: state.credits + event.discount,
    }));
    get().addLog(
      i18nStore.t("random_events.logs.trader_cargo", {
        bonus: event.discount,
      }),
      "info",
    );
    return;
  }

  get().addLog(i18nStore.t("random_events.logs.trader_standard"), "info");
}

function applyDerelictChoice(
  event: Extract<PendingRandomEvent, { type: "derelict" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    addResearchResource(set, "ancient_data", 1);
    addResearchResource(set, "tech_salvage", 1);
    get().gainExp(findLivingCrew(get(), "scientist"), SPECIALIST_EXP);
    get().addLog(i18nStore.t("random_events.logs.derelict_science"), "info");
    return;
  }

  if (choice === "systems") {
    addResearchResource(set, "tech_salvage", 2);
    set((state) => ({ credits: state.credits + event.reward }));
    get().addLog(
      i18nStore.t("random_events.logs.derelict_scanner", {
        reward: event.reward,
      }),
      "info",
    );
    return;
  }

  set((state) => ({ credits: state.credits + Math.floor(event.reward * 0.5) }));
  get().addLog(
    i18nStore.t("random_events.logs.derelict_standard", {
      reward: Math.floor(event.reward * 0.5),
    }),
    "info",
  );
}

function applyAncientSignalChoice(
  _event: Extract<PendingRandomEvent, { type: "ancient_signal" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    addResearchResource(set, "ancient_data", 2);
    addResearchResource(set, "tech_salvage", 1);
    get().gainExp(findLivingCrew(get(), "scientist"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.ancient_signal_scientist"),
      "info",
    );
    return;
  }

  if (choice === "systems") {
    addResearchResource(set, "tech_salvage", 1);
    get().addLog(
      i18nStore.t("random_events.logs.ancient_signal_scanner"),
      "info",
    );
    return;
  }

  get().addLog(
    i18nStore.t("random_events.logs.ancient_signal_standard"),
    "info",
  );
}

function applyResearchBreakthroughChoice(
  _event: Extract<PendingRandomEvent, { type: "research_breakthrough" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    addResearchResource(set, "ancient_data", 2);
    addResearchResource(set, "tech_salvage", 2);
    get().gainExp(findLivingCrew(get(), "scientist"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.research_breakthrough_scientist"),
      "info",
    );
    return;
  }

  if (choice === "systems") {
    addResearchResource(set, "tech_salvage", 1);
    get().addLog(
      i18nStore.t("random_events.logs.research_breakthrough_scanner"),
      "info",
    );
    return;
  }

  get().addLog(
    i18nStore.t("random_events.logs.research_breakthrough_standard"),
    "info",
  );
}

function applyArtifactResonanceChoice(
  _event: Extract<PendingRandomEvent, { type: "artifact_resonance" }>,
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void {
  if (choice === "specialist") {
    addResearchResource(set, "ancient_data", 2);
    changeCrewHappiness(set, 5);
    get().gainExp(findLivingCrew(get(), "scientist"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.artifact_resonance_scientist"),
      "info",
    );
    return;
  }

  if (choice === "systems") {
    addResearchResource(set, "ancient_data", 1);
    addResearchResource(set, "tech_salvage", 1);
    get().addLog(
      i18nStore.t("random_events.logs.artifact_resonance_lab"),
      "info",
    );
    return;
  }

  changeCrewHappiness(set, 1);
  get().addLog(
    i18nStore.t("random_events.logs.artifact_resonance_standard"),
    "info",
  );
}

// ─── Resolve entry point ──────────────────────────────────────

export const resolveRandomEvent = (
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void => {
  const event = get().pendingRandomEvent;
  if (!event) return;
  if (!canUseRandomEventChoice(get(), event, choice)) {
    get().addLog(
      i18nStore.t("random_events.logs.choice_unavailable"),
      "warning",
    );
    return;
  }

  switch (event.type) {
    case "storm":
      applyStormChoice(event, choice, set, get);
      break;
    case "capsule":
      applyCapsuleChoice(event, choice, set, get);
      break;
    case "virus":
      applyVirusChoice(event, choice, set, get);
      break;
    case "fuel_leak":
      applyFuelLeakChoice(event, choice, set, get);
      break;
    case "crew_dispute":
      applyCrewDisputeChoice(event, choice, set, get);
      break;
    case "biohazard":
      applyBiohazardChoice(event, choice, set, get);
      break;
    case "meteor_shower":
      applyMeteorShowerChoice(event, choice, set, get);
      break;
    case "pirate_raid":
      applyPirateRaidChoice(event, choice, set, get);
      break;
    case "distress_signal":
      applyDistressSignalChoice(event, choice, set, get);
      break;
    case "trader":
      applyTraderChoice(event, choice, set, get);
      break;
    case "derelict":
      applyDerelictChoice(event, choice, set, get);
      break;
    case "ancient_signal":
      applyAncientSignalChoice(event, choice, set, get);
      break;
    case "research_breakthrough":
      applyResearchBreakthroughChoice(event, choice, set, get);
      break;
    case "artifact_resonance":
      applyArtifactResonanceChoice(event, choice, set, get);
      break;
    case "consequence":
      applyRandomEventConsequence(event, set, get);
      break;
  }

  if (event.type !== "consequence") {
    set({
      scheduledRandomEventConsequence: scheduleRandomEventConsequence(
        event.type,
        choice,
        get().turn,
      ),
    });
  }

  if (event.type !== "consequence" && choice === "specialist") {
    grantTimedEffect("decisive_response", set, get);
  }

  set({ pendingRandomEvent: null });
  get().updateShipStats();
  get().saveGame();
};

// ─── Trigger logic ────────────────────────────────────────────

function generateEventPayload(
  type: RandomEventType,
  state: GameState,
): PendingRandomEvent {
  switch (type) {
    case "storm":
      return {
        type: "storm",
        damage: randomInRange(STORM_DAMAGE_MIN, STORM_DAMAGE_MAX),
        targetModuleId: randomElement(state.ship.modules).id,
      };
    case "capsule":
      return {
        type: "capsule",
        reward: randomInRange(CAPSULE_REWARDS_MIN, CAPSULE_REWARDS_MAX),
      };
    case "virus":
      return { type: "virus", happinessPenalty: VIRUS_HAPPINESS_PENALTY };
    case "fuel_leak":
      return {
        type: "fuel_leak",
        fuelLoss: randomInRange(FUEL_LEAK_MIN, FUEL_LEAK_MAX),
      };
    case "crew_dispute":
      return {
        type: "crew_dispute",
        happinessPenalty: CREW_DISPUTE_HAPPINESS_PENALTY,
      };
    case "biohazard":
      return {
        type: "biohazard",
        crewDamage: randomInRange(BIOHAZARD_DAMAGE_MIN, BIOHAZARD_DAMAGE_MAX),
      };
    case "meteor_shower":
      return {
        type: "meteor_shower",
        damage: randomInRange(METEOR_DAMAGE_MIN, METEOR_DAMAGE_MAX),
        targetModuleId: randomElement(state.ship.modules).id,
      };
    case "pirate_raid":
      return {
        type: "pirate_raid",
        creditLoss: randomInRange(PIRATE_CREDIT_LOSS_MIN, PIRATE_CREDIT_LOSS_MAX),
      };
    case "distress_signal":
      return { type: "distress_signal" };
    case "trader":
      return {
        type: "trader",
        discount: randomInRange(TRADER_DISCOUNT_MIN, TRADER_DISCOUNT_MAX),
      };
    case "derelict":
      return {
        type: "derelict",
        reward: randomInRange(DERELICT_REWARD_MIN, DERELICT_REWARD_MAX),
      };
    case "ancient_signal":
      return { type: "ancient_signal" };
    case "research_breakthrough":
      return { type: "research_breakthrough" };
    case "artifact_resonance":
      return { type: "artifact_resonance" };
  }
}

export const processRandomEvents = (
  _state: GameState,
  set: SetState,
  get: () => GameStore,
): void => {
  const state = get();

  // Phase A: resolve pending consequence
  const consequence = state.scheduledRandomEventConsequence;
  if (
    consequence &&
    isRandomEventConsequenceDue(consequence, state.turn) &&
    !state.currentCombat &&
    !state.pendingTravelEvent &&
    !state.pendingRandomEvent
  ) {
    set({
      pendingRandomEvent: { type: "consequence", ...consequence },
      scheduledRandomEventConsequence: null,
    });
    get().addLog(
      i18nStore.t("random_events.logs.detected_consequence"),
      "warning",
    );
    return;
  }

  // Phase B: maybe spawn a fresh event
  if (
    state.currentCombat ||
    state.pendingTravelEvent ||
    state.pendingRandomEvent ||
    state.scheduledRandomEventConsequence ||
    state.turn < FIRST_EVENT_TURN ||
    state.randomEventCooldown > 0 ||
    Math.random() >= EVENT_TRIGGER_CHANCE
  ) {
    return;
  }

  const eventType = pickRandomEvent(state);
  const event = generateEventPayload(eventType, state);

  set({ pendingRandomEvent: event, randomEventCooldown: EVENT_COOLDOWN });
  get().addLog(
    i18nStore.t(`random_events.logs.detected_${event.type}`),
    "warning",
  );
};
