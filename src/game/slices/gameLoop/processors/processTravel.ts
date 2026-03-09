import type { GameState, GameStore } from "@/game/types";
import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";

/**
 * Обработка путешествий между секторами
 */
export const processTravel = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const traveling = get().traveling;
    if (!traveling) return;

    const nextTurnsLeft = traveling.turnsLeft - 1;

    set((s) => ({
        traveling: s.traveling
            ? { ...s.traveling, turnsLeft: nextTurnsLeft }
            : null,
    }));

    // Случайные события в пути
    if (Math.random() < 0.3) {
        const events = ["Аномалия", "Астероиды", "Тревога", "Сигнал"];
        const event = events[Math.floor(Math.random() * events.length)];
        get().addLog(event, "warning");
        if (event === "Астероиды") {
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) =>
                        m.id ===
                        s.ship.modules[
                            Math.floor(Math.random() * s.ship.modules.length)
                        ].id
                            ? {
                                  ...m,
                                  health: Math.max(10, m.health - 5),
                              }
                            : m,
                    ),
                },
            }));
        }
    }

    // Прибытие в сектор назначения
    if (nextTurnsLeft <= 0) {
        const destinationSector = traveling.destination;

        const patrolContracts = state.activeContracts.filter(
            (c) =>
                c.type === "patrol" &&
                c.isRaceQuest &&
                c.targetSectors?.includes(destinationSector.id),
        );

        const scanContracts = state.activeContracts.filter(
            (c) =>
                c.type === "scan_planet" &&
                c.targetSector === destinationSector.id,
        );

        let newActiveContracts = state.activeContracts;
        let contractCompleted = false;
        let completedContractId = "";

        // Обработка контрактов на сканирование
        scanContracts.forEach((c) => {
            const hasScanner = state.ship.modules.some(
                (m) => m.type === "scanner" && !m.disabled && m.health > 0,
            );
            if (!hasScanner) {
                get().addLog(
                    `📡 Сканирование: нужен сканер для выполнения контракта`,
                    "warning",
                );
                return;
            }

            const hasTargetPlanet = destinationSector.locations.some(
                (l) => l.type === "planet" && l.planetType === c.planetType,
            );
            if (!hasTargetPlanet) {
                get().addLog(
                    `📡 Сканирование: планета типа "${c.planetType}" не найдена`,
                    "warning",
                );
                return;
            }

            const updated = { ...c, visited: (c.visited || 0) + 1 };
            newActiveContracts = newActiveContracts.map((ac) =>
                ac.id === c.id ? updated : ac,
            );

            get().addLog(
                `📡 Сканирование: ${c.planetType} отсканировано! Возвращайтесь на базу`,
                "info",
            );
        });

        // Обработка патрульных контрактов
        patrolContracts.forEach((c) => {
            const visitedSectors = [
                ...new Set([...(c.visitedSectors || []), destinationSector.id]),
            ];
            const targetSectors = c.targetSectors || [];

            if (visitedSectors.length >= targetSectors.length) {
                contractCompleted = true;
                completedContractId = c.id;
                get().addLog(
                    `Сбор биообразцов завершён! +${c.reward}₢`,
                    "info",
                );

                const expReward = CONTRACT_REWARDS.patrol.baseExp;
                giveCrewExperience(
                    expReward,
                    `Экипаж получил опыт: +${expReward} ед.`,
                );

                newActiveContracts = newActiveContracts.filter(
                    (ac) => ac.id !== c.id,
                );
            } else {
                newActiveContracts = newActiveContracts.map((ac) =>
                    ac.id === c.id ? { ...ac, visitedSectors } : ac,
                );
                get().addLog(
                    `Биообразцы: ${visitedSectors.length}/${targetSectors.length} секторов`,
                    "info",
                );
            }
        });

        set((s) => ({
            currentSector: destinationSector,
            traveling: null,
            credits: contractCompleted
                ? s.credits +
                  (patrolContracts.find((c) => c.id === completedContractId)
                      ?.reward || 0)
                : s.credits,
            completedContractIds: contractCompleted
                ? [...s.completedContractIds, completedContractId]
                : s.completedContractIds,
            activeContracts: newActiveContracts,
        }));
        get().addLog(`Прибытие в ${destinationSector.name}`, "info");
        get().updateShipStats();
        set(() => ({ gameMode: "sector_map" }));
    }
};
