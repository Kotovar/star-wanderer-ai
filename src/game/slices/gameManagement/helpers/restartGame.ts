import { generateGalaxy } from "@/game/galaxy";
import { initializeStationData } from "@/game/stations";
import { initialState } from "@/game/initial";
import { clearLocalStorage, saveToLocalStorage } from "@/game/saves/utils";
import { playSound } from "@/sounds";
import { buildStartingState } from "./buildStartingState";
import { DEFAULT_TEMPLATE_ID } from "@/game/constants/shipTemplates";
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
    startTemplateId: templateId,
  });

  get().addLog("Новая игра", "info");
  playSound("success");

  saveToLocalStorage(get());
};
