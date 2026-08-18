import { store as i18nStore } from "@/lib/useTranslation";
import { getRunProfileArcEncounter } from "@/game/galaxy/runProfileArcs";
import { getAmbushChanceModifier } from "@/game/artifacts";
import { addEnemyCodexEntry, getEnemyCodexId } from "@/game/constants/enemyCodex";
import { getMedicalAugmentationCatalog } from "@/game/stations/medicalAugmentations";
import { determineSignalOutcome } from "@/game/signals";
import type { GameStore, Location, SetState } from "@/game/types";
import { getRaceReputationLevel } from "@/game/reputation/utils";
import { patchLocation } from "@/game/utils/patchLocation";
import { getNavigatorLocationKey } from "@/game/types/navigator";
import { isWantedCheckpointRequired } from "@/game/slices/pirate/wanted";

// ============================================================================
// Константы
// ============================================================================

/** Босс требует уровень сканера 3+ */
const BOSS_TIER = 3;

// ============================================================================
// Вспомогательные функции
// ============================================================================

/**
 * Обновляет статус посещения локации в галактике и текущем секторе
 * @param loc - Локация для отметки
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const markLocationVisited = (
    loc: Location,
    set: SetState,
    get: () => GameStore,
): void => {
    if (!get().currentSector) return;
    set((s) => {
        const sectorId = s.currentSector?.id;
        if (sectorId === undefined) return s;

        const key = getNavigatorLocationKey(sectorId, loc.id);
        const current = s.knownLocationIntel[key];
        return {
            ...patchLocation(s, loc.id, { visited: true }),
            knownLocationIntel: {
                ...s.knownLocationIntel,
                [key]: {
                    sectorId,
                    locationId: loc.id,
                    highestScanRange: Math.max(current?.highestScanRange ?? 0, 8),
                    visited: true,
                },
            },
        };
    });
};

/**
 * Обновляет локацию в текущем секторе и устанавливает её как выбранную
 * @param loc - Обновлённая локация
 * @param set - Функция обновления состояния
 */
const updateLocationInSector = (loc: Location, set: SetState): void => {
    // Через patchLocation: запись только в currentSector терялась при выходе
    // из сектора — currentSector пересобирается из galaxy.sectors при возврате.
    set((s) => ({
        ...patchLocation(s, loc.id, (existing) => ({
            ...loc,
            visited: existing.visited || loc.visited,
        })),
        currentLocation: {
            ...loc,
            visited:
                s.currentLocation?.id === loc.id
                    ? s.currentLocation.visited || loc.visited
                    : loc.visited,
        },
    }));
};

/**
 * Проверяет, обнаружен ли объект сканером
 * @param loc - Локация для проверки
 * @param get - Функция получения состояния
 * @returns true если объект обнаружен сканером
 */
const isObjectScanned = (loc: Location, get: () => GameStore): boolean => {
    if (loc.type === "enemy") {
        return get().canScanObject("enemy", loc.threat ?? 1);
    }
    if (loc.type === "space_monster") {
        return get().canScanObject("space_monster", loc.threat ?? 1);
    }
    if (loc.type === "boss") {
        return get().canScanObject("boss", BOSS_TIER);
    }
    if (loc.type === "anomaly") {
        return get().canScanObject("anomaly", loc.anomalyTier ?? 1);
    }
    if (loc.type === "friendly_ship") {
        return get().canScanObject("friendly_ship");
    }
    if (loc.type === "derelict_ship") {
        return get().canScanObject("derelict_ship");
    }
    if (loc.type === "storm") {
        return get().canScanObject("storm");
    }
    return true;
};

/**
 * Проверяет раннее обнаружение угрозы
 * @param tier - Уровень угрозы
 * @param get - Функция получения состояния
 * @returns true если угроза обнаружена заранее
 */
const checkEarlyWarning = (tier: number, get: () => GameStore): boolean => {
    const chance = get().getEarlyWarningChance(tier);
    return Math.random() * 100 < chance;
};

// ============================================================================
// Основная функция
// ============================================================================

/**
 * Обрабатывает выбор локации для посещения в текущем секторе
 *
 * Функция проверяет тип локации и запускает соответствующий сценарий:
 * - Станции/планеты: открытие панели, доставка капсул с выжившими
 * - Враги/боссы: бой или режим "неизвестный корабль"
 * - Аномалии: проверка учёного на борту
 * - Сигналы бедствия: раскрытие типа сигнала
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param locationIdx - Индекс локации в массиве locations текущего сектора
 */
export const selectLocation = (
    set: SetState,
    get: () => GameStore,
    locationIdx: number,
): void => {
    const state = get();
    const loc = state.currentSector?.locations[locationIdx];
    if (!loc) return;

    // Повторное посещение resolved сигналов бедствия (просмотр того, что было)
    if (loc.type === "distress_signal" && loc.signalResolved) {
        markLocationVisited(loc, set, get);
        set({ currentLocation: loc, gameMode: "distress_signal" });
        return;
    }

    // Проверяется до completedLocations: победа над базой заносит её туда же,
    // и без этой ветки игрок читал бы «уже посещено» вместо «база уничтожена»
    if (loc.pirateBaseDestroyed) {
        get().addLog(i18nStore.t("pirate.base_destroyed_wreck"), "warning");
        return;
    }

    // После стрельбы на досмотре станция закрыта: без этого бой можно было
    // отыграть заново и выбрать на том же досмотре другой исход
    if (loc.checkpointFought) {
        get().addLog(i18nStore.t("pirate.checkpoint_docks_closed"), "warning");
        return;
    }

    // Локация уже посещена
    if (state.completedLocations.includes(loc.id)) {
        get().addLog( i18nStore.t("game_logs.selectLocation_1", { loc_name: loc.name }), "warning");
        return;
    }

    set({ currentLocation: loc });

    // Отметка локации как посещённой для прогресса и карты сектора.
    markLocationVisited(loc, set, get);

    // Путешествие внутри сектора всегда занимает ход
    get().nextTurn();

    // Обработка по типу локации
    switch (loc.type) {
        case "station": {
            const stationRace = loc.dominantRace;
            if (
                loc.stationType !== "diplomatic" &&
                stationRace &&
                getRaceReputationLevel(state.raceReputation, stationRace) === "hostile"
            ) {
                set({ gameMode: "hostile_approach_warning" });
                break;
            }
            if (
                !loc.stationConfig?.isPirate &&
                isWantedCheckpointRequired(get().wantedHeat ?? 0)
            ) {
                set({ gameMode: "wanted_checkpoint" });
                break;
            }
            if (
                loc.stationType === "medical" &&
                (loc.stationConfig?.allowsCrewHeal ?? true) &&
                state.research.researchedTechs.includes("cybernetic_augmentation")
            ) {
                const catalog = getMedicalAugmentationCatalog(
                    loc.stationId ?? loc.id,
                    loc.dominantRace,
                    state.currentSector?.tier ?? 1,
                    state.raceReputation,
                );
                set((s) => ({
                    discoveredAugmentationIds: [
                        ...new Set([
                            ...(s.discoveredAugmentationIds ?? []),
                            ...catalog,
                        ]),
                    ],
                }));
            }
            // Док на станции с торговлей: её цены становятся известными игроку
            if (loc.stationId && (loc.stationConfig?.allowsTrade ?? true)) {
                const stationId = loc.stationId;
                set((s) => ({
                    knownTradeStations: s.knownTradeStations.includes(stationId)
                        ? s.knownTradeStations
                        : [...s.knownTradeStations, stationId],
                }));
            }
            set({ gameMode: "station" });
            break;
        }

        case "planet": {
            const planetRace = loc.dominantRace;
            const isBanned = state.bannedPlanets?.includes(loc.id);
            if (
                !loc.isEmpty &&
                planetRace &&
                (getRaceReputationLevel(state.raceReputation, planetRace) === "hostile" || isBanned)
            ) {
                set({ gameMode: "hostile_approach_warning" });
                break;
            }
            set({ gameMode: "planet" });
            get().processScanContracts();
            if (!loc.isEmpty) {
                get().completeScanContracts();
                get().handleDiplomacyContracts(locationIdx);
                get().handleSupplyRunContracts(locationIdx);
                get().handleGasDiveContracts(locationIdx);
                get().handleExpeditionSurveyContracts(locationIdx);
                get().handleCrisisResponseContracts(locationIdx);
                get().handleFabricationContracts(locationIdx);
            }
            break;
        }

        case "enemy": {
            if (loc.defeated) {
                get().addLog( i18nStore.t("game_logs.selectLocation_2", { loc_name: loc.name }), "info");
                break;
            }
            const enemyTier = loc.threat ?? 1;
            const canScan = isObjectScanned(loc, get);

            if (!canScan && !loc.signalRevealed) {
                if (checkEarlyWarning(enemyTier, get)) {
                    get().addLog( i18nStore.t("game_logs.selectLocation_3"),
                        "warning",
                    );
                    const revealedLoc = { ...loc, signalRevealed: true };
                    updateLocationInSector(revealedLoc, set);
                }
                set({ gameMode: "unknown_ship" });
            } else {
                get().startCombat(loc);
            }
            break;
        }

        case "profile_signal": {
            if (loc.defeated) {
                set({ gameMode: "sector_map" });
                break;
            }
            if (state.runProfileArcTarget?.locationId === loc.id) {
                get().startCombat({
                    ...loc,
                    ...getRunProfileArcEncounter(state.runProfileArcTarget),
                });
            }
            break;
        }

        case "space_monster": {
            if (loc.spaceMonsterResolved === "hunted") {
                set({ gameMode: "sector_map" });
                break;
            }
            const canScan = isObjectScanned(loc, get);
            if (canScan || loc.signalRevealed) {
                set((s) => ({
                    discoveredEnemyCodexIds: addEnemyCodexEntry(
                        s.discoveredEnemyCodexIds,
                        getEnemyCodexId(loc),
                    ),
                    gameMode: "space_monster",
                }));
            } else {
                set({ gameMode: "unknown_ship" });
            }
            break;
        }

        case "boss": {
            if (loc.bossDefeated) {
                get().addLog( i18nStore.t("game_logs.selectLocation_4", { loc_name: loc.name }), "info");
                return;
            }

            const canScan = isObjectScanned(loc, get);
            if (!canScan && !loc.signalRevealed) {
                if (checkEarlyWarning(BOSS_TIER, get)) {
                    get().addLog( i18nStore.t("game_logs.selectLocation_5"),
                        "warning",
                    );
                    const revealedLoc = { ...loc, signalRevealed: true };
                    updateLocationInSector(revealedLoc, set);
                    get().startBossCombat(revealedLoc);
                } else {
                    set({ gameMode: "unknown_ship" });
                }
            } else {
                get().startBossCombat(loc);
            }
            break;
        }

        case "anomaly": {
            const canScan = isObjectScanned(loc, get);
            set({
                gameMode:
                    canScan || loc.signalRevealed ? "anomaly" : "unknown_ship",
            });
            break;
        }

        case "friendly_ship": {
            const canScan = isObjectScanned(loc, get);
            // Unknown ship: player doesn't know which race it is yet — let them decide first
            if (!canScan && !loc.signalRevealed) {
                set({ gameMode: "unknown_ship" });
                break;
            }
            // Ship is identified — now check if the race is hostile
            const shipRace = loc.dominantRace;
            if (
                shipRace &&
                getRaceReputationLevel(state.raceReputation, shipRace) === "hostile"
            ) {
                set({ gameMode: "hostile_approach_warning" });
                break;
            }
            // Сдача квестов этого корабля: скан планет, поставки и экспедиции
            get().completeScanContracts();
            get().handleSupplyRunContracts(locationIdx);
            get().handleExpeditionSurveyContracts(locationIdx);
            set({ gameMode: "friendly_ship" });
            break;
        }

        case "asteroid_belt":
            set({ gameMode: "asteroid_belt" });
            break;

        case "storm": {
            const canScan = isObjectScanned(loc, get);
            if (!canScan && !loc.signalRevealed) {
                set({ currentLocation: loc, gameMode: "storm" });
            } else {
                get().addLog( i18nStore.t("game_logs.selectLocation_6"), "warning");
                set({ currentLocation: loc, gameMode: "storm" });
            }
            break;
        }

        case "distress_signal": {
            if (!loc.signalRevealChecked) {
                const canReveal =
                    Math.random() * 100 < get().getSignalRevealChance();

                if (canReveal && !loc.signalType) {
                    const outcome = determineSignalOutcome(
                        getAmbushChanceModifier(state.artifacts),
                    );
                    updateLocationInSector(
                        {
                            ...loc,
                            signalType: outcome,
                            signalRevealed: true,
                            signalRevealChecked: true,
                        },
                        set,
                    );
                } else {
                    updateLocationInSector(
                        { ...loc, signalRevealChecked: true },
                        set,
                    );
                }
            }
            set({ gameMode: "distress_signal" });
            break;
        }

        case "derelict_ship": {
            const canScan = isObjectScanned(loc, get);
            set({
                gameMode:
                    canScan || loc.signalRevealed ? "derelict_ship" : "unknown_ship",
            });
            break;
        }

        case "gas_giant":
            set({ gameMode: "gas_giant" });
            break;

        case "wreck_field":
            set({ gameMode: "wreck_field" });
            break;
    }
};
