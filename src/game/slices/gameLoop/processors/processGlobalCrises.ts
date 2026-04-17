import type { GameState, GameStore, SetState } from "@/game/types";
import {
  GLOBAL_CRISES,
  CRISIS_INTERVAL,
  CRISIS_WARNING_TURNS,
} from "@/game/constants/globalCrises";

/**
 * Выбирает случайный кризис, исключая только что завершившийся
 */
const pickRandomCrisis = (excludeId?: string) => {
  const pool = GLOBAL_CRISES.filter((c) => c.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
};

/**
 * Обработка глобальных кризисов — вызывается каждый ход.
 *
 * Логика:
 * 1. Если кризис активен — применяет его эффект и уменьшает счётчик;
 *    когда счётчик достигает 0 — кризис завершается.
 * 2. Если до следующего кризиса осталось CRISIS_WARNING_TURNS ходов —
 *    показывает предупреждение в лог один раз.
 * 3. Когда наступает ход кризиса — активирует случайный кризис.
 */
export const processGlobalCrises = (
  state: GameState,
  set: SetState,
  get: () => GameStore,
): void => {
  const { turn, activeCrisis, nextCrisisTurn } = state;

  // ── Активный кризис ────────────────────────────────────────────────────────
  if (activeCrisis) {
    const crisis = GLOBAL_CRISES.find((c) => c.id === activeCrisis.id);
    if (crisis) {
      crisis.onTurnEffect(set, get);
    }

    const newRemaining = activeCrisis.turnsRemaining - 1;
    if (newRemaining <= 0) {
      set(() => ({ activeCrisis: null }));
      get().addLog(`✅ Кризис "${crisis?.icon ?? ""}" завершён`, "info");
    } else {
      set(() => ({
        activeCrisis: { ...activeCrisis, turnsRemaining: newRemaining },
      }));
    }
    return;
  }

  // ── Предупреждение ─────────────────────────────────────────────────────────
  const turnsUntilCrisis = nextCrisisTurn - turn;
  if (turnsUntilCrisis === CRISIS_WARNING_TURNS) {
    get().addLog(
      `⚠️ Внимание! Через ${CRISIS_WARNING_TURNS} хода надвигается галактический кризис!`,
      "warning",
    );
    return;
  }

  // ── Начало нового кризиса ──────────────────────────────────────────────────
  if (turn >= nextCrisisTurn) {
    const crisis = pickRandomCrisis();
    set(() => ({
      activeCrisis: { id: crisis.id, turnsRemaining: crisis.duration },
      nextCrisisTurn: nextCrisisTurn + CRISIS_INTERVAL,
    }));
    get().addLog(
      `🚨 ГАЛАКТИЧЕСКИЙ КРИЗИС: ${crisis.icon} Длительность: ${crisis.duration} хода`,
      "error",
    );
  }
};
