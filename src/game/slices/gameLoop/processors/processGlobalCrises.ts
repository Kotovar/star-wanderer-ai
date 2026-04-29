import type { GameState, GameStore, SetState } from "@/game/types";
import {
  CRISIS_WARNING_TURNS,
  FIRST_CRISIS_TURN_MIN,
  GLOBAL_CRISES,
  pickWeightedCrisis,
  rollInitialCrisisTurn,
  rollNextCrisisTurn,
} from "@/game/constants/globalCrises";
import { store as i18nStore } from "@/lib/useTranslation";

/**
 * Выбирает случайный кризис, исключая только что завершившийся
 */
const getCrisisById = (id?: string | null) =>
  GLOBAL_CRISES.find((crisis) => crisis.id === id);

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
  const { turn, activeCrisis, nextCrisisTurn, nextCrisisId } = state;

  // Balance migration for old saves: crises planned by the previous early schedule
  // should not interrupt the opening phase.
  if (turn < FIRST_CRISIS_TURN_MIN) {
    if (activeCrisis) {
      const crisis = getCrisisById(activeCrisis.id);
      crisis?.onEndEffect?.(set, get, activeCrisis);
      set(() => ({
        activeCrisis: null,
        nextCrisisTurn: rollInitialCrisisTurn(),
        nextCrisisId,
      }));
      get().addLog("⚠️ Ранний галактический кризис отложен: система кризисов перебалансирована", "info");
      return;
    }

    if (nextCrisisTurn < FIRST_CRISIS_TURN_MIN) {
      set(() => ({ nextCrisisTurn: rollInitialCrisisTurn() }));
      return;
    }
  }

  // ── Активный кризис ────────────────────────────────────────────────────────
  if (activeCrisis) {
    const crisis = getCrisisById(activeCrisis.id);
    if (crisis) {
      const updatedData = crisis.onTurnEffect(set, get, activeCrisis);
      if (updatedData !== undefined) {
        set(() => ({
          activeCrisis: { ...activeCrisis, data: { ...activeCrisis.data, ...updatedData } },
        }));
      }
    }

    const newRemaining = activeCrisis.turnsRemaining - 1;
    if (newRemaining <= 0) {
      if (crisis?.onEndEffect) {
        crisis.onEndEffect(set, get, activeCrisis);
      }
      set(() => ({ activeCrisis: null }));
      get().addLog(
        `✅ Кризис завершён: ${crisis?.icon ?? ""} ${crisis ? i18nStore.t(crisis.nameKey) : ""}`.trim(),
        "info",
      );
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
    const upcomingCrisis = getCrisisById(nextCrisisId);
    get().addLog(
      upcomingCrisis
        ? `⚠️ ${upcomingCrisis.icon} ${i18nStore.t(upcomingCrisis.warningKey)}. До кризиса ${CRISIS_WARNING_TURNS} хода`
        : `⚠️ Внимание! Через ${CRISIS_WARNING_TURNS} хода надвигается галактический кризис!`,
      "warning",
    );
  }

  // ── Начало нового кризиса ──────────────────────────────────────────────────
  if (turn >= nextCrisisTurn) {
    const crisis = getCrisisById(nextCrisisId) ?? pickWeightedCrisis(state);
    const preparedData = crisis.onStartEffect?.(set, get) ?? undefined;
    const freshState = get();
    const nextPlannedCrisis = pickWeightedCrisis(freshState, crisis.id);
    set(() => ({
      activeCrisis: {
        id: crisis.id,
        turnsRemaining: crisis.duration,
        data: preparedData,
      },
      nextCrisisTurn: rollNextCrisisTurn(turn, freshState),
      nextCrisisId: nextPlannedCrisis.id,
    }));
    get().addLog(
      `🚨 ГАЛАКТИЧЕСКИЙ КРИЗИС: ${crisis.icon} ${i18nStore.t(crisis.nameKey)} · длительность ${crisis.duration} хода`,
      "error",
    );
  }
};
