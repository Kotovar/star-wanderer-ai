import type { GlobalCrisis } from "@/game/types/crisis";
import type { GameState } from "@/game/types";
import { RACES } from "@/game/constants/races";
import { TRADE_GOODS } from "@/game/constants/goods";

// ─── Константы ────────────────────────────────────────────────────────────────

/** Первый кризис приходит в случайном окне, а не в фиксированный ход */
export const FIRST_CRISIS_TURN_MIN = 12;
export const FIRST_CRISIS_TURN_MAX = 18;

/** Интервал между кризисами тоже плавает */
export const CRISIS_INTERVAL_MIN = 12;
export const CRISIS_INTERVAL_MAX = 22;

/** За сколько ходов до кризиса показывать предупреждение */
export const CRISIS_WARNING_TURNS = 3;

// ─── Значения эффектов ────────────────────────────────────────────────────────

const MIN_MODULE_HEALTH = 10;
const CRITICAL_MODULE_TYPES = new Set([
  "engine",
  "shield",
  "scanner",
  "lab",
  "medical",
  "cargo",
  "fueltank",
  "weaponbay",
  "reactor",
]);

const pickRandomItems = <T,>(items: T[], count: number): T[] => {
  const pool = [...items];
  const result: T[] = [];
  while (pool.length > 0 && result.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    const [picked] = pool.splice(index, 1);
    result.push(picked);
  }
  return result;
};

const getOperationalModules = (state: GameState) =>
  state.ship.modules.filter(
    (module) =>
      module.health > 0 &&
      !module.disabled &&
      !module.manualDisabled &&
      CRITICAL_MODULE_TYPES.has(module.type),
  );

const damageModules = (
  set: Parameters<NonNullable<GlobalCrisis["onTurnEffect"]>>[0],
  moduleIds: number[],
  amount: number,
) => {
  if (moduleIds.length === 0) return;
  set((s: GameState) => ({
    ship: {
      ...s.ship,
      modules: s.ship.modules.map((module) =>
        moduleIds.includes(module.id)
          ? {
              ...module,
              health: Math.max(MIN_MODULE_HEALTH, module.health - amount),
            }
          : module,
      ),
    },
  }));
};

const setModulesManualDisabled = (
  set: Parameters<NonNullable<GlobalCrisis["onTurnEffect"]>>[0],
  moduleIds: number[],
  disabled: boolean,
) => {
  if (moduleIds.length === 0) return;
  set((s: GameState) => ({
    ship: {
      ...s.ship,
      modules: s.ship.modules.map((module) =>
        moduleIds.includes(module.id)
          ? { ...module, manualDisabled: disabled }
          : module,
      ),
    },
  }));
};

const formatNames = (names: string[]) => names.join(", ");

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const countModulesByTypes = (state: GameState, types: string[]) =>
  state.ship.modules.filter((module) => types.includes(module.type)).length;

export const rollInitialCrisisTurn = () =>
  randomInt(FIRST_CRISIS_TURN_MIN, FIRST_CRISIS_TURN_MAX);

const getCrisisWeights = (
  state: GameState,
  excludeId?: string,
): Record<string, number> => {
  const totalCargo = state.ship.tradeGoods.reduce((sum, good) => sum + good.quantity, 0);
  const sensitiveModules = countModulesByTypes(state, [
    "shield",
    "scanner",
    "lab",
    "medical",
    "ai_core",
    "deep_survey_array",
  ]);
  const fuelSystems = countModulesByTypes(state, ["engine", "fueltank", "pulse_drive"]);
  const organicCrew = state.crew.filter(
    (crewMember) => RACES[crewMember.race]?.canGetSick !== false,
  ).length;
  const hasMedic = state.crew.some((crewMember) => crewMember.profession === "medic");
  const avgModuleHealth =
    state.ship.modules.length > 0
      ? state.ship.modules.reduce((sum, module) => sum + module.health / module.maxHealth, 0) /
        state.ship.modules.length
      : 1;

  const weights: Record<string, number> = {
    raider_wave:
      1 +
      Math.min(3.5, state.credits / 700) +
      Math.min(2.5, totalCargo / 18) +
      Math.random() * 1.5,
    solar_flare:
      1 +
      sensitiveModules * 0.8 +
      Math.max(0, 1.8 - avgModuleHealth * 1.4) +
      Math.random() * 1.5,
    epidemic:
      (organicCrew > 0 ? 1 : 0) +
      organicCrew * 0.55 +
      (hasMedic ? 0.35 : 2.2) +
      Math.random() * 1.4,
    fuel_shortage:
      1 +
      fuelSystems * 0.9 +
      Math.max(0, (40 - state.ship.fuel) / 12) +
      Math.random() * 1.5,
  };

  if (excludeId) {
    weights[excludeId] = 0;
  }

  return weights;
};

export const pickWeightedCrisis = (
  state: GameState,
  excludeId?: string,
) => {
  const weights = getCrisisWeights(state, excludeId);
  const pool = GLOBAL_CRISES.filter((crisis) => (weights[crisis.id] ?? 0) > 0);
  const totalWeight = pool.reduce((sum, crisis) => sum + (weights[crisis.id] ?? 0), 0);

  if (pool.length === 0 || totalWeight <= 0) {
    const fallback = GLOBAL_CRISES.filter((crisis) => crisis.id !== excludeId);
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  let roll = Math.random() * totalWeight;
  for (const crisis of pool) {
    roll -= weights[crisis.id] ?? 0;
    if (roll <= 0) return crisis;
  }

  return pool[pool.length - 1];
};

export const rollNextCrisisTurn = (
  currentTurn: number,
  state: GameState,
) => {
  const creditsPressure = state.credits > 1800 ? -2 : state.credits < 300 ? 2 : 0;
  const fuelPressure = state.ship.fuel < 25 ? -1 : state.ship.fuel > 90 ? 1 : 0;
  const crewPressure = state.crew.length >= 6 ? -1 : 0;
  const instabilityPressure = creditsPressure + fuelPressure + crewPressure;

  const minDelay = Math.max(8, CRISIS_INTERVAL_MIN + instabilityPressure);
  const maxDelay = Math.max(minDelay + 2, CRISIS_INTERVAL_MAX + instabilityPressure);
  return currentTurn + randomInt(minDelay, maxDelay);
};

// ─── Кризисы ──────────────────────────────────────────────────────────────────

export const GLOBAL_CRISES: GlobalCrisis[] = [
  // ── 1. Рейдерская волна ───────────────────────────────────────────────────
  {
    id: "raider_wave",
    nameKey: "crises.raider_wave.name",
    warningKey: "crises.raider_wave.warning",
    descriptionKey: "crises.raider_wave.description",
    effectsKey: "crises.raider_wave.effects",
    icon: "🏴‍☠️",
    duration: 4,
    onStartEffect: (set, get) => {
      const state = get();
      const targets = pickRandomItems(getOperationalModules(state), 2);
      damageModules(set, targets.map((module) => module.id), 7);
      const cargoLoss = pickRandomItems(state.ship.tradeGoods, 1)[0];
      if (cargoLoss) {
        const stolenQty = Math.max(1, Math.ceil(cargoLoss.quantity * 0.25));
        set((s: GameState) => ({
          ship: {
            ...s.ship,
            tradeGoods: s.ship.tradeGoods
              .map((good) =>
                good.item === cargoLoss.item
                  ? { ...good, quantity: Math.max(0, good.quantity - stolenQty) }
                  : good,
              )
              .filter((good) => good.quantity > 0),
          },
        }));
        get().addLog(
          `🏴‍☠️ Рейдеры прорвали периметр и похитили ${TRADE_GOODS[cargoLoss.item]?.name ?? cargoLoss.item} x${stolenQty}`,
          "error",
        );
      }
      if (targets.length > 0) {
        get().addLog(
          `🏴‍☠️ Под ударом внешние системы: ${formatNames(targets.map((module) => module.name))}`,
          "warning",
        );
      }
    },
    onTurnEffect: (set, get) => {
      const state = get();
      const targets = pickRandomItems(getOperationalModules(state), 1);
      const creditLoss = Math.min(
        55,
        Math.max(15, Math.round((state.credits || 0) * 0.08)),
      );
      if (state.credits > 0) {
        set((s: GameState) => ({
          credits: Math.max(0, s.credits - creditLoss),
        }));
      } else {
        set((s: GameState) => ({
          ship: {
            ...s.ship,
            fuel: Math.max(0, s.ship.fuel - 4),
          },
        }));
      }
      damageModules(set, targets.map((module) => module.id), 6);
      const targetName = targets[0]?.name;
      set((s: GameState) => ({
        crew: s.crew.map((crewMember) => ({
          ...crewMember,
          happiness: Math.max(0, crewMember.happiness - 3),
        })),
      }));
      get().addLog(
        targetName
          ? `🏴‍☠️ Рейдерский налёт: -${state.credits > 0 ? creditLoss : 0}₢, повреждён ${targetName}`
          : `🏴‍☠️ Рейдерский налёт: ${state.credits > 0 ? `-${creditLoss}₢` : "-4 топлива"}, экипаж на взводе`,
        "error",
      );
    },
  },

  // ── 2. Солнечная вспышка ─────────────────────────────────────────────────
  {
    id: "solar_flare",
    nameKey: "crises.solar_flare.name",
    warningKey: "crises.solar_flare.warning",
    descriptionKey: "crises.solar_flare.description",
    effectsKey: "crises.solar_flare.effects",
    icon: "☀️",
    duration: 3,
    onStartEffect: (set, get) => {
      const state = get();
      const disrupted = state.ship.modules.filter(
        (module) =>
          ["shield", "scanner", "lab", "medical", "ai_core", "deep_survey_array"].includes(
            module.type,
          ) &&
          module.health > 0 &&
          !module.manualDisabled,
      );
      const disruptedIds = disrupted.map((module) => module.id);
      setModulesManualDisabled(set, disruptedIds, true);
      set((s: GameState) => ({
        ship: {
          ...s.ship,
          shields: 0,
        },
      }));
      if (disrupted.length > 0) {
        get().addLog(
          `☀️ Электроника ослеплена вспышкой: ${formatNames(disrupted.map((module) => module.name))}`,
          "warning",
        );
      }
      return { disabledModuleIds: disruptedIds };
    },
    onTurnEffect: (set, get, activeCrisis) => {
      const disruptedIds = (activeCrisis.data?.disabledModuleIds as number[] | undefined) ?? [];
      damageModules(set, disruptedIds, 4);
      set((s: GameState) => ({
        ship: {
          ...s.ship,
          shields: 0,
        },
      }));
      get().addLog(
        disruptedIds.length > 0
          ? "☀️ Солнечная вспышка: экраны перегружены, чувствительные модули продолжают страдать"
          : "☀️ Солнечная вспышка: щиты сорваны, сенсоры захлёбываются помехами",
        "error",
      );
    },
    onEndEffect: (set, get, activeCrisis) => {
      const disruptedIds = (activeCrisis.data?.disabledModuleIds as number[] | undefined) ?? [];
      setModulesManualDisabled(set, disruptedIds, false);
      if (disruptedIds.length > 0) {
        get().addLog("☀️ Солнечная активность спала, бортовая электроника возвращается в строй", "info");
      }
    },
  },

  // ── 3. Эпидемия ───────────────────────────────────────────────────────────
  {
    id: "epidemic",
    nameKey: "crises.epidemic.name",
    warningKey: "crises.epidemic.warning",
    descriptionKey: "crises.epidemic.description",
    effectsKey: "crises.epidemic.effects",
    icon: "🦠",
    duration: 4,
    onStartEffect: (set, get) => {
      const organicCrew = get().crew.filter(
        (crewMember) => RACES[crewMember.race]?.canGetSick !== false,
      );
      const infected = pickRandomItems(organicCrew, Math.min(2, organicCrew.length));
      if (infected.length > 0) {
        get().addLog(
          `🦠 Вспышка болезни на борту: заражены ${formatNames(infected.map((crewMember) => crewMember.name))}`,
          "error",
        );
      }
      return { infectedCrewIds: infected.map((crewMember) => crewMember.id) };
    },
    onTurnEffect: (set, get, activeCrisis) => {
      const infectedIds = (activeCrisis.data?.infectedCrewIds as number[] | undefined) ?? [];
      const hasMedicSupport = get().crew.some(
        (crewMember) =>
          crewMember.profession === "medic" &&
          crewMember.health > 0,
      );
      const infectedHealthLoss = hasMedicSupport ? 3 : 6;
      const infectedMoraleLoss = hasMedicSupport ? 4 : 7;
      const backgroundMoraleLoss = hasMedicSupport ? 1 : 2;
      set((s: GameState) => ({
        crew: s.crew.map((c) => ({
          ...c,
          happiness: Math.max(
            0,
            c.happiness - (infectedIds.includes(c.id) ? infectedMoraleLoss : backgroundMoraleLoss),
          ),
          health: infectedIds.includes(c.id)
            ? Math.max(1, c.health - infectedHealthLoss)
            : c.health,
        })),
      }));
      get().addLog(
        hasMedicSupport
          ? "🦠 Эпидемия сдерживается медиками, но заражённые всё ещё слабеют"
          : "🦠 Эпидемия распространяется по жилым отсекам и давит на мораль экипажа",
        "error",
      );
    },
    onEndEffect: (set, get) => {
      set((s: GameState) => ({
        crew: s.crew.map((crewMember) => ({
          ...crewMember,
          happiness: Math.min(crewMember.maxHappiness || 100, crewMember.happiness + 5),
          health: Math.min(crewMember.maxHealth, crewMember.health + 4),
        })),
      }));
      get().addLog("🦠 Карантин снят: экипаж приходит в себя", "info");
    },
  },

  // ── 4. Топливный кризис ──────────────────────────────────────────────────
  {
    id: "fuel_shortage",
    nameKey: "crises.fuel_shortage.name",
    warningKey: "crises.fuel_shortage.warning",
    descriptionKey: "crises.fuel_shortage.description",
    effectsKey: "crises.fuel_shortage.effects",
    icon: "⛽",
    duration: 4,
    onStartEffect: (set, get) => {
      const state = get();
      const bottleneckModules = state.ship.modules.filter(
        (module) =>
          ["engine", "fueltank", "pulse_drive"].includes(module.type) &&
          module.health > 0 &&
          !module.manualDisabled,
      );
      const throttled = pickRandomItems(bottleneckModules, Math.min(2, bottleneckModules.length));
      const throttledIds = throttled.map((module) => module.id);
      setModulesManualDisabled(set, throttledIds, true);
      set((s: GameState) => ({
        ship: {
          ...s.ship,
          fuel: Math.max(0, s.ship.fuel - 10),
        },
      }));
      if (throttled.length > 0) {
        get().addLog(
          `⛽ Топливный кризис: тяга ограничена в системах ${formatNames(throttled.map((module) => module.name))}`,
          "warning",
        );
      } else {
        get().addLog("⛽ Топливный кризис: баки пустеют быстрее обычного", "warning");
      }
      return { throttledModuleIds: throttledIds };
    },
    onTurnEffect: (set, get, activeCrisis) => {
      const throttledIds = (activeCrisis.data?.throttledModuleIds as number[] | undefined) ?? [];
      const activeCrew = get().crew.length;
      const drain = Math.min(10, 4 + Math.floor(activeCrew / 3));
      set((s: GameState) => ({
        ship: {
          ...s.ship,
          fuel: Math.max(0, s.ship.fuel - drain),
        },
        crew: s.crew.map((crewMember) => ({
          ...crewMember,
          happiness: Math.max(0, crewMember.happiness - 2),
        })),
      }));
      damageModules(set, throttledIds, 3);
      get().addLog(
        `⛽ Нормирование топлива: -${drain} топлива, экипажу урезаны перелёты и пайки`,
        "warning",
      );
    },
    onEndEffect: (set, get, activeCrisis) => {
      const throttledIds = (activeCrisis.data?.throttledModuleIds as number[] | undefined) ?? [];
      setModulesManualDisabled(set, throttledIds, false);
      get().addLog("⛽ Топливные поставки стабилизировались, двигатели снова доступны", "info");
    },
  },
];
