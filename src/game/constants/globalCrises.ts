import type { GlobalCrisis } from "@/game/types/crisis";
import type { GameState } from "@/game/types";

// ─── Константы ────────────────────────────────────────────────────────────────

/** Ходов между кризисами */
export const CRISIS_INTERVAL = 18;

/** Ход первого кризиса */
export const FIRST_CRISIS_TURN = 15;

/** За сколько ходов до кризиса показывать предупреждение */
export const CRISIS_WARNING_TURNS = 3;

// ─── Значения эффектов ────────────────────────────────────────────────────────

const MIN_MODULE_HEALTH = 10;

// ─── Кризисы ──────────────────────────────────────────────────────────────────

export const GLOBAL_CRISES: GlobalCrisis[] = [
  // ── 1. Рейдерская волна ───────────────────────────────────────────────────
  {
    id: "raider_wave",
    nameKey: "crises.raider_wave.name",
    warningKey: "crises.raider_wave.warning",
    icon: "🏴‍☠️",
    duration: 3,
    onTurnEffect: (set, get) => {
      const modules = get().ship.modules;
      if (modules.length === 0) return;
      const target = modules[Math.floor(Math.random() * modules.length)];
      set((s: GameState) => ({
        credits: Math.max(0, s.credits - 20),
        ship: {
          ...s.ship,
          modules: s.ship.modules.map((m) =>
            m.id === target.id
              ? { ...m, health: Math.max(MIN_MODULE_HEALTH, m.health - 8) }
              : m,
          ),
        },
      }));
      get().addLog(
        `🏴‍☠️ Рейдерский рейд: -20₢, повреждён ${target.name}`,
        "error",
      );
    },
  },

  // ── 2. Солнечная вспышка ─────────────────────────────────────────────────
  {
    id: "solar_flare",
    nameKey: "crises.solar_flare.name",
    warningKey: "crises.solar_flare.warning",
    icon: "☀️",
    duration: 2,
    onTurnEffect: (set, get) => {
      set((s: GameState) => ({
        ship: {
          ...s.ship,
          modules: s.ship.modules.map((m) => ({
            ...m,
            health: Math.max(MIN_MODULE_HEALTH, m.health - 5),
          })),
        },
      }));
      get().addLog("☀️ Солнечная вспышка! Все модули корабля повреждены (-5%)", "error");
    },
  },

  // ── 3. Эпидемия ───────────────────────────────────────────────────────────
  {
    id: "epidemic",
    nameKey: "crises.epidemic.name",
    warningKey: "crises.epidemic.warning",
    icon: "🦠",
    duration: 3,
    onTurnEffect: (set, get) => {
      set((s: GameState) => ({
        crew: s.crew.map((c) => ({
          ...c,
          happiness: Math.max(0, c.happiness - 8),
          health: Math.max(1, c.health - 5),
        })),
      }));
      get().addLog("🦠 Эпидемия: экипаж теряет здоровье и боевой дух (-5 HP, -8 морали)", "error");
    },
  },

  // ── 4. Топливный кризис ──────────────────────────────────────────────────
  {
    id: "fuel_shortage",
    nameKey: "crises.fuel_shortage.name",
    warningKey: "crises.fuel_shortage.warning",
    icon: "⛽",
    duration: 4,
    onTurnEffect: (set, get) => {
      set((s: GameState) => ({
        ship: {
          ...s.ship,
          fuel: Math.max(0, s.ship.fuel - 8),
        },
      }));
      get().addLog("⛽ Топливный кризис: утечка в баках (-8 топлива)", "warning");
    },
  },
];
