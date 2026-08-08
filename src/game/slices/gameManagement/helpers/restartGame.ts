import { store as i18nStore } from "@/lib/useTranslation";
import { generateGalaxy } from "@/game/galaxy";
import { generateNebulae } from "@/game/galaxy/nebulae";
import { initializeStationData } from "@/game/stations";
import { initialState } from "@/game/initial";
import { clearLocalStorage, saveToLocalStorage } from "@/game/saves/utils";
import { playSound, setAudioVolumes, setSoundPlaybackEnabled } from "@/sounds";
import { loadPlayerSettings } from "../../settings/playerSettings";
import { buildStartingState } from "./buildStartingState";
import { getRunModifierLocationWeights } from "@/game/constants/launchModifiers";
import { applyResearchedTechs } from "@/game/research/applyResearchedTechs";
import { DEFAULT_TEMPLATE_ID } from "@/game/constants/shipTemplates";
import { getVictoryObjectives } from "@/game/constants/victoryObjectives";
import { RESEARCH_TREE } from "@/game/constants/research";
import {
  pickWeightedCrisis,
  rollNextCrisisTurn,
} from "@/game/constants/globalCrises";
import {
  getRunProfile,
  pickRunProfileId,
  type RunProfileId,
} from "@/game/galaxy/runProfiles";
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
 * @param profileId - ID профиля нового забега
 */
export const restartGame = (
  set: SetState,
  get: () => GameStore,
  templateId: string = DEFAULT_TEMPLATE_ID,
  modifierIds: string[] = [],
  profileId?: RunProfileId,
): void => {
  const profile = getRunProfile(profileId ?? pickRunProfileId());
  if (!profile) return;
  const settings = loadPlayerSettings(get().settings);
  setSoundPlaybackEnabled(settings.soundEnabled);
  setAudioVolumes(settings);
  const patch = buildStartingState(templateId, modifierIds);
  clearLocalStorage();

  // Модификаторы запуска могут смещать состав галактики («В розыске» — охотники)
  const modifierWeights = getRunModifierLocationWeights(modifierIds);
  const runProfile = Object.keys(modifierWeights).length
    ? {
        ...profile,
        locationWeights: Object.entries(modifierWeights).reduce(
          (weights, [key, multiplier]) => ({
            ...weights,
            [key]: (profile.locationWeights[key as keyof typeof modifierWeights] ?? 1) * multiplier,
          }),
          { ...profile.locationWeights },
        ),
      }
    : profile;

  const newSectors = generateGalaxy(runProfile);
  const nebulae = generateNebulae(newSectors);
  newSectors[STARTING_SECTOR_INDEX].visited = true;

  const { prices: restartPrices, stock: restartStock } =
    initializeStationData(newSectors);

  const patchedReputation = patch.raceReputation
    ? { ...initialState.raceReputation, ...patch.raceReputation }
    : initialState.raceReputation;
  const knownRaces = patch.knownRaces
    ? [...new Set([...initialState.knownRaces, ...patch.knownRaces])]
    : initialState.knownRaces;

  set({
    ...initialState,
    settings,
    currentSector: newSectors[STARTING_SECTOR_INDEX],
    galaxy: { sectors: newSectors, nebulae },
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
    startModifierIds: modifierIds,
    runProfileId: profile.id,
    // initialState — модульный синглтон, вычисляется один раз при импорте,
    // поэтому его runId нельзя переиспользовать между забегами — иначе все
    // рестарты, которые не проходят через loadFromSlot, получили бы один и
    // тот же id и recordRunResult() молча схлопнул бы их в один забег.
    runId: crypto.randomUUID(),
  });

  if (patch.startingTechIds?.length) {
    set(applyResearchedTechs(get(), patch.startingTechIds));
    if (patch.startingTechIds.length === 1) {
      const [startingTechId] = patch.startingTechIds;
      get().addLog(
        i18nStore.t("game_logs.restartGame_1", {
          startingTechId: RESEARCH_TREE[startingTechId]?.name ?? startingTechId,
        }),
        "info",
      );
    } else {
      get().addLog(
        i18nStore.t("game_logs.restartGame_all_tech", {
          count: patch.startingTechIds.length,
        }),
        "info",
      );
    }
  }

  get().updateShipStats();

  if (patch.startsWithCrisis) {
    const crisis = pickWeightedCrisis(get());
    const crisisData = crisis.onStartEffect?.(set, get) ?? undefined;
    const stateAfterStart = get();
    const nextCrisis = pickWeightedCrisis(stateAfterStart, crisis.id);
    set((state) => ({
      activeCrisis: {
        id: crisis.id,
        turnsRemaining: crisis.duration,
        data: { ...crisisData, startedFromModifier: true },
      },
      discoveredCrisisIds: [
        ...new Set([...state.discoveredCrisisIds, crisis.id]),
      ],
      nextCrisisTurn: rollNextCrisisTurn(state.turn, stateAfterStart),
      nextCrisisId: nextCrisis.id,
    }));
    get().addLog( i18nStore.t("game_logs.restartGame_2", { icon: crisis.icon, value: i18nStore.t(crisis.nameKey), duration: crisis.duration }),
      "error",
    );
  }

  get().addLog( i18nStore.t("game_logs.restartGame_3"), "info");
  get().addLog( i18nStore.t("game_logs.restartGame_4", { value: getVictoryObjectives()
      .map((objective) => i18nStore.t(objective.titleKey))
      .join(" / ") }),
    "info",
  );
  playSound("ui_confirm");

  saveToLocalStorage(get());
};
