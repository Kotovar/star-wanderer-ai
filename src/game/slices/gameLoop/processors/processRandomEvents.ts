import { isModuleActive } from "@/game/modules";
import type {
  GameState,
  GameStore,
  PendingRandomEvent,
  RandomEventChoiceId,
  SetState,
} from "@/game/types";
import { store as i18nStore } from "@/lib/useTranslation";

const EVENT_TRIGGER_CHANCE = 0.08;
const EVENT_COOLDOWN = 8;
const FIRST_EVENT_TURN = 6;
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

type RandomEventState = Pick<GameState, "crew" | "ship">;

const randomInRange = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomElement = <T>(items: T[]): T =>
  items[randomInRange(0, items.length - 1)];

const findLivingCrew = (
  state: RandomEventState,
  profession: GameState["crew"][number]["profession"],
) => state.crew.find((member) => member.profession === profession && member.health > 0);

const findActiveModule = (state: RandomEventState, type: GameState["ship"]["modules"][number]["type"]) =>
  state.ship.modules.find((module) => module.type === type && isModuleActive(module));

export function canUseRandomEventChoice(
  state: RandomEventState,
  event: PendingRandomEvent,
  choice: RandomEventChoiceId,
): boolean {
  if (choice === "standard") return true;

  switch (event.type) {
    case "storm": {
      if (choice === "systems") return state.ship.shields > 0;
      const cockpit = findActiveModule(state, "cockpit");
      const pilot = findLivingCrew(state, "pilot");
      return !!cockpit && pilot?.moduleId === cockpit.id;
    }
    case "capsule":
      if (choice === "specialist") return !!findLivingCrew(state, "scientist");
      return !!findLivingCrew(state, "engineer") && !!findActiveModule(state, "cargo");
    case "virus":
      if (choice === "specialist") return !!findLivingCrew(state, "medic");
      return (
        state.crew.some((member) => member.race === "synthetic" && member.health > 0) ||
        !!findActiveModule(state, "ai_core")
      );
    case "fuel_leak":
      if (choice === "specialist") return !!findLivingCrew(state, "engineer");
      return !!findActiveModule(state, "repair_bay");
    case "crew_dispute":
      if (choice === "specialist") return !!findLivingCrew(state, "pilot");
      return !!findActiveModule(state, "quarters");
  }
}

function damageModule(set: SetState, moduleId: number, damage: number): void {
  if (damage <= 0) return;
  set((state) => ({
    ship: {
      ...state.ship,
      modules: state.ship.modules.map((module) =>
        module.id === moduleId
          ? { ...module, health: Math.max(MIN_MODULE_HEALTH, module.health - damage) }
          : module,
      ),
    },
  }));
}

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
      ship: { ...state.ship, shields: Math.max(0, state.ship.shields - absorbed) },
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
    i18nStore.t("random_events.logs.storm_standard", { damage: event.damage }),
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
    set((state) => ({
      research: {
        ...state.research,
        resources: {
          ...state.research.resources,
          ancient_data: (state.research.resources.ancient_data ?? 0) + 1,
        },
      },
    }));
    get().gainExp(findLivingCrew(get(), "scientist"), SPECIALIST_EXP);
    get().addLog(i18nStore.t("random_events.logs.capsule_science"), "info");
    return;
  }

  if (choice === "systems") {
    set((state) => ({
      research: {
        ...state.research,
        resources: {
          ...state.research.resources,
          tech_salvage: (state.research.resources.tech_salvage ?? 0) + 2,
        },
      },
    }));
    get().gainExp(findLivingCrew(get(), "engineer"), SPECIALIST_EXP);
    get().addLog(i18nStore.t("random_events.logs.capsule_salvage"), "info");
    return;
  }

  set((state) => ({ credits: state.credits + event.reward }));
  get().addLog(
    i18nStore.t("random_events.logs.capsule_standard", { reward: event.reward }),
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
    set((state) => ({
      crew: state.crew.map((member) => ({
        ...member,
        happiness: Math.max(0, member.happiness - reducedPenalty),
      })),
    }));
    get().gainExp(findLivingCrew(get(), "medic"), SPECIALIST_EXP);
    get().addLog(
      i18nStore.t("random_events.logs.virus_medic", { penalty: reducedPenalty }),
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

  set((state) => ({
    crew: state.crew.map((member) => ({
      ...member,
      happiness: Math.max(0, member.happiness - event.happinessPenalty),
    })),
  }));
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
      i18nStore.t("random_events.logs.fuel_leak_engineer", { loss: reducedLoss }),
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
    i18nStore.t("random_events.logs.fuel_leak_standard", { loss: event.fuelLoss }),
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
    get().addLog(i18nStore.t("random_events.logs.crew_dispute_quarters"), "info");
    return;
  }

  const penalty = choice === "specialist" ? 2 : event.happinessPenalty;
  set((state) => ({
    crew: state.crew.map((member) => ({
      ...member,
      happiness: Math.max(0, member.happiness - penalty),
    })),
  }));

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

export const resolveRandomEvent = (
  choice: RandomEventChoiceId,
  set: SetState,
  get: () => GameStore,
): void => {
  const event = get().pendingRandomEvent;
  if (!event) return;
  if (!canUseRandomEventChoice(get(), event, choice)) {
    get().addLog(i18nStore.t("random_events.logs.choice_unavailable"), "warning");
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
  }

  set({ pendingRandomEvent: null });
  get().updateShipStats();
  get().saveGame();
};

export const processRandomEvents = (
  _state: GameState,
  set: SetState,
  get: () => GameStore,
): void => {
  const state = get();
  if (
    state.currentCombat ||
    state.pendingTravelEvent ||
    state.pendingRandomEvent ||
    state.turn < FIRST_EVENT_TURN ||
    state.randomEventCooldown > 0 ||
    Math.random() >= EVENT_TRIGGER_CHANCE
  ) {
    return;
  }

  const eventType = randomElement([
    "storm",
    "capsule",
    "virus",
    "fuel_leak",
    "crew_dispute",
  ] as const);
  let event: PendingRandomEvent;

  if (eventType === "storm") {
    const targetModule = randomElement(state.ship.modules);
    event = {
      type: "storm",
      damage: randomInRange(STORM_DAMAGE_MIN, STORM_DAMAGE_MAX),
      targetModuleId: targetModule.id,
    };
  } else if (eventType === "capsule") {
    event = {
      type: "capsule",
      reward: randomInRange(CAPSULE_REWARDS_MIN, CAPSULE_REWARDS_MAX),
    };
  } else if (eventType === "virus") {
    event = { type: "virus", happinessPenalty: VIRUS_HAPPINESS_PENALTY };
  } else if (eventType === "fuel_leak") {
    event = {
      type: "fuel_leak",
      fuelLoss: randomInRange(FUEL_LEAK_MIN, FUEL_LEAK_MAX),
    };
  } else {
    event = {
      type: "crew_dispute",
      happinessPenalty: CREW_DISPUTE_HAPPINESS_PENALTY,
    };
  }

  set({ pendingRandomEvent: event, randomEventCooldown: EVENT_COOLDOWN });
  get().addLog(i18nStore.t(`random_events.logs.detected_${event.type}`), "warning");
};
