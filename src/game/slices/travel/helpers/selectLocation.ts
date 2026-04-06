import { findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";
import { determineSignalOutcome } from "@/game/signals";
import type { GameStore, Location, SetState } from "@/game/types";
import { getRaceReputationLevel } from "@/game/reputation/utils";

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
    const sector = get().currentSector;
    if (!sector) return;

    set((s) => {
        const updateLocations = (locations: Location[]) =>
            locations.map((l) =>
                l.id === loc.id ? { ...l, visited: true } : l,
            );

        return {
            galaxy: {
                ...s.galaxy,
                sectors: s.galaxy.sectors.map((sec) =>
                    sec.id === sector.id
                        ? {
                              ...sec,
                              locations: updateLocations(sec.locations),
                          }
                        : sec,
                ),
            },
            currentSector: s.currentSector
                ? {
                      ...s.currentSector,
                      locations: updateLocations(s.currentSector.locations),
                  }
                : null,
        };
    });
};

/**
 * Обновляет локацию в текущем секторе и устанавливает её как выбранную
 * @param loc - Обновлённая локация
 * @param set - Функция обновления состояния
 */
const updateLocationInSector = (loc: Location, set: SetState): void => {
    set((s) => ({
        currentLocation: loc,
        currentSector: s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map((l) =>
                      l.id === loc.id ? loc : l,
                  ),
              }
            : null,
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
        set({ currentLocation: loc, gameMode: "distress_signal" });
        return;
    }

    // Локация уже посещена
    if (state.completedLocations.includes(loc.id)) {
        get().addLog(`${loc.name} уже посещена`, "warning");
        return;
    }

    set({ currentLocation: loc });

    // Отметка локации как посещённой (для планет и станций)
    if (loc.type === "planet" || loc.type === "station") {
        markLocationVisited(loc, set, get);
    }

    // Путешествие внутри сектора всегда занимает ход
    get().nextTurn();

    // Обработка по типу локации
    switch (loc.type) {
        case "station": {
            const stationRace = loc.dominantRace;
            if (
                stationRace &&
                getRaceReputationLevel(state.raceReputation, stationRace) === "hostile"
            ) {
                set({ gameMode: "hostile_approach_warning" });
                break;
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
            if (!loc.isEmpty) {
                get().processScanContracts();
                get().completeScanContracts();
                get().handleDiplomacyContracts(locationIdx);
                get().handleSupplyRunContracts(locationIdx);
                get().handleGasDiveContracts(locationIdx);
                get().handleExpeditionSurveyContracts(locationIdx);
            }
            break;
        }

        case "enemy": {
            if (loc.defeated) {
                get().addLog(`${loc.name} уже побеждён`, "info");
                break;
            }
            const enemyTier = loc.threat ?? 1;
            const canScan = isObjectScanned(loc, get);

            if (!canScan && !loc.signalRevealed) {
                if (checkEarlyWarning(enemyTier, get)) {
                    get().addLog(
                        "📡 Сканер обнаружил засаду! Будьте осторожны.",
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

        case "boss": {
            if (loc.bossDefeated) {
                get().addLog(`${loc.name} уже уничтожен`, "info");
                return;
            }

            const canScan = isObjectScanned(loc, get);
            if (!canScan && !loc.signalRevealed) {
                if (checkEarlyWarning(BOSS_TIER, get)) {
                    get().addLog(
                        "📡 Сканер обнаружил ДРЕВНЮЮ УГРОЗУ! Готовьтесь к бою.",
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
                get().addLog("📡 Сканер обнаружил шторм впереди!", "warning");
                set({ currentLocation: loc, gameMode: "storm" });
            }
            break;
        }

        case "distress_signal": {
            if (!loc.signalRevealChecked) {
                const canReveal =
                    Math.random() * 100 < get().getSignalRevealChance();

                if (canReveal && !loc.signalType) {
                    const eyeOfSingularity = findActiveArtifact(
                        state.artifacts,
                        ARTIFACT_TYPES.EYE_OF_SINGULARITY,
                    );

                    const ambushModifier = eyeOfSingularity
                        ? (eyeOfSingularity?.negativeEffect?.value ?? 0.5)
                        : 0;
                    const outcome = determineSignalOutcome(ambushModifier);
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
