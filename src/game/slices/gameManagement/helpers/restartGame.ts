import { generateGalaxy } from "@/game/galaxy";
import { initializeStationData } from "@/game/stations";
import { initialState } from "@/game/initial";
import { clearLocalStorage, saveToLocalStorage } from "@/game/saves/utils";
import { playSound } from "@/sounds";
import { buildStartingState } from "./buildStartingState";
import { DEFAULT_TEMPLATE_ID } from "@/game/constants/shipTemplates";
import { getVictoryObjectives } from "@/game/constants/victoryObjectives";
import {
  GLOBAL_CRISES,
  pickWeightedCrisis,
  rollNextCrisisTurn,
} from "@/game/constants/globalCrises";
import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";

/**
 * Индекс начального сектора в галактике
 */
const STARTING_SECTOR_INDEX = 0;

/**
 * Выполняет перезапуск игры с генерацией новой галактики.
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения текущего состояния
 * @param templateId - ID шаблона корабля (по умолчанию "explorer")
 * @param modifierIds - Активные модификаторы запуска
 */
export const restartGame = (
  set: SetState,
  get: () => GameStore,
  templateId: string = DEFAULT_TEMPLATE_ID,
  modifierIds: string[] = [],
): void => {
  clearLocalStorage();

  const newSectors = generateGalaxy();
  newSectors[STARTING_SECTOR_INDEX].visited = true;

  const { prices: restartPrices, stock: restartStock } =
    initializeStationData(newSectors);

  const patch = buildStartingState(templateId, modifierIds);

  const patchedReputation = patch.raceReputation
    ? { ...initialState.raceReputation, ...patch.raceReputation }
    : initialState.raceReputation;
  const knownRaces = patch.knownRaces
    ? [...new Set([...initialState.knownRaces, ...patch.knownRaces])]
    : initialState.knownRaces;

  set({
    ...initialState,
    currentSector: newSectors[STARTING_SECTOR_INDEX],
    galaxy: { sectors: newSectors },
    stationPrices: restartPrices,
    stationStock: restartStock,
    log: [],
    credits: patch.credits,
    probes: patch.probes,
    ship: patch.ship,
    crew: patch.crew,
    artifacts: patch.artifacts,
    research: {
      ...initialState.research,
      resources: patch.researchResources,
    },
    raceReputation: patchedReputation,
    knownRaces,
    startTemplateId: templateId,
  });

  if (patch.startingCrisisId) {
    const crisis = GLOBAL_CRISES.find(
      (item) => item.id === patch.startingCrisisId,
    );
    if (crisis) {
      const crisisData = crisis.onStartEffect?.(set, get) ?? undefined;
      const stateAfterStart = get();
      const nextCrisis = pickWeightedCrisis(stateAfterStart, crisis.id);
      set((state) => ({
        activeCrisis: {
          id: crisis.id,
          turnsRemaining: crisis.duration,
          data: { ...crisisData, startedFromModifier: true },
        },
        nextCrisisTurn: rollNextCrisisTurn(state.turn, stateAfterStart),
        nextCrisisId: nextCrisis.id,
      }));
      get().addLog(
        `🚨 ГАЛАКТИЧЕСКИЙ КРИЗИС: ${crisis.icon} ${i18nStore.t(crisis.nameKey)} · длительность ${crisis.duration} хода`,
        "error",
      );
    }
  }

  get().addLog("Новая игра", "info");
  get().addLog(
    `Способы победы: ${getVictoryObjectives()
      .map((objective) => objective.title)
      .join(" / ")}`,
    "info",
  );
  playSound("success");

  saveToLocalStorage(get());
};
