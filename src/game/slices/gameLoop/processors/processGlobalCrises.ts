import { store as i18nStore } from "@/lib/useTranslation";
import { playSound } from "@/sounds";
import type { GameState, GameStore, SetState } from "@/game/types";
import {
  FIRST_CRISIS_TURN_MIN,
  GLOBAL_CRISES,
  pickWeightedCrisis,
  rollInitialCrisisTurn,
  rollNextCrisisTurn,
} from "@/game/constants/globalCrises";
import { getCrisisStage } from "@/game/crises/escalation";
import {
  dropStaleCrisisOffers,
  seedCrisisResponseOffers,
} from "@/game/contracts/seedResponseContracts";

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
 * 2. Когда наступает ход кризиса — активирует случайный кризис.
 */
export const processGlobalCrises = (
  state: GameState,
  set: SetState,
  get: () => GameStore,
): void => {
  const { turn, activeCrisis, nextCrisisTurn, nextCrisisId } = state;

  // Balance migration for old saves: crises planned by the previous early schedule
  // should not interrupt the opening phase.
  if (
    turn < FIRST_CRISIS_TURN_MIN &&
    activeCrisis?.data?.startedFromModifier !== true
  ) {
    if (activeCrisis) {
      const crisis = getCrisisById(activeCrisis.id);
      crisis?.onEndEffect?.(set, get, activeCrisis);
      set(() => ({
        activeCrisis: null,
        nextCrisisTurn: rollInitialCrisisTurn(),
        nextCrisisId,
      }));
      get().addLog( i18nStore.t("game_logs.processGlobalCrises_1"), "info");
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
    let updatedData = activeCrisis.data;
    if (crisis) {
      const crisisData = crisis.onTurnEffect(set, get, activeCrisis);
      if (crisisData !== undefined) {
        updatedData = { ...activeCrisis.data, ...crisisData };
      }
    }

    const crisisAfterTurn = { ...activeCrisis, data: updatedData };
    const newRemaining = activeCrisis.turnsRemaining - 1;
    if (newRemaining <= 0) {
      if (crisis?.onEndEffect) {
        crisis.onEndEffect(set, get, crisisAfterTurn);
      }
      set((s) => {
        const sectors = dropStaleCrisisOffers(s.galaxy.sectors, null);
        return {
          activeCrisis: null,
          ...(sectors ? { galaxy: { ...s.galaxy, sectors } } : {}),
        };
      });
      get().addLog(
        i18nStore.t("game_logs.crisis_ended", {
          icon: crisis?.icon ?? "",
          name: crisis ? i18nStore.t(crisis.nameKey) : "",
        }).trim(),
        "info",
      );
      playSound("ui_notification");
    } else {
      const currentStage = getCrisisStage(activeCrisis, crisis?.duration ?? newRemaining);
      const nextStage = getCrisisStage(
        { ...crisisAfterTurn, turnsRemaining: newRemaining },
        crisis?.duration ?? newRemaining,
      );
      set(() => ({
        activeCrisis: { ...crisisAfterTurn, turnsRemaining: newRemaining },
      }));
      if (crisis && currentStage.id !== nextStage.id) {
        get().addLog(
          i18nStore.t("game_logs.crisis_escalates", {
            icon: crisis.icon,
            name: i18nStore.t(crisis.nameKey),
            stage: i18nStore.t(`crisis_panel.stage.stages.${nextStage.id}.name`),
          }),
          "error",
        );
        playSound("world_danger");
      }
    }
    return;
  }

  // ── Начало нового кризиса ──────────────────────────────────────────────────
  if (turn >= nextCrisisTurn) {
    const crisis = getCrisisById(nextCrisisId) ?? pickWeightedCrisis(state);
    const preparedData = crisis.onStartEffect?.(set, get) ?? undefined;
    const freshState = get();
    const nextPlannedCrisis = pickWeightedCrisis(freshState, crisis.id);
    const startedCrisis = {
      id: crisis.id,
      turnsRemaining: crisis.duration,
      data: preparedData,
    };
    set((s) => {
      // Планеты просят помощи сразу, а не через сто ходов до следующего
      // обновления предложений — кризис успел бы кончиться раньше
      const sectors = seedCrisisResponseOffers(s.galaxy.sectors, startedCrisis);
      return {
        activeCrisis: startedCrisis,
        discoveredCrisisIds: [
          ...new Set([...freshState.discoveredCrisisIds, crisis.id]),
        ],
        nextCrisisTurn: rollNextCrisisTurn(turn, freshState),
        nextCrisisId: nextPlannedCrisis.id,
        ...(sectors ? { galaxy: { ...s.galaxy, sectors } } : {}),
      };
    });
    get().addLog( i18nStore.t("game_logs.processGlobalCrises_2", { icon: crisis.icon, value: i18nStore.t(crisis.nameKey), duration: crisis.duration }),
      "error",
    );
    playSound("world_danger");
  }
};
