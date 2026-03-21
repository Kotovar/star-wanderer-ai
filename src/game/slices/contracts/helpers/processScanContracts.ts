import type { GameState, LogEntry } from "@/game/types";
import { isModuleActive } from "@/game/modules/utils";

/**
 * Обрабатывает сканирование планеты при посещении локации
 * Проверяет контракты на сканирование и обновляет прогресс
 *
 * @param state - Текущее состояние игры
 * @returns Объект с результатом обработки сканирования
 */
export const processScanContracts = (state: GameState) => {
    const location = state.currentLocation;

    if (!location || location.type !== "planet") {
        return {
            success: false,
            message: "требуется посетить планету",
            contracts: state.activeContracts,
        };
    }

    // Контракты на сканирование для текущего типа планеты
    const scanContracts = state.activeContracts.filter(
        (c) => c.type === "scan_planet" && c.planetType === location.planetType,
    );

    if (scanContracts.length === 0) {
        return {
            success: false,
            contracts: state.activeContracts,
        };
    }

    // Проверка наличия сканера
    const hasScanner = state.ship.modules.some(
        (m) => m.type === "scanner" && isModuleActive(m),
    );

    if (!hasScanner) {
        return {
            success: false,
            message: "нужен сканер для выполнения контракта",
            contracts: state.activeContracts,
        };
    }

    let newActiveContracts = state.activeContracts;
    const logs: { message: string; type: LogEntry["type"] }[] = [];

    scanContracts.forEach((c) => {
        const required = c.requiresVisit ?? 1;

        // Проверяем, не выполнен ли уже контракт
        if (c.visited && c.visited >= required) {
            logs.push({
                message: "планета уже отсканирована по этому контракту",
                type: "info",
            });
            return;
        }

        const newVisited = (c.visited || 0) + 1;
        const updated = { ...c, visited: newVisited };
        newActiveContracts = newActiveContracts.map((ac) =>
            ac.id === c.id ? updated : ac,
        );

        if (newVisited >= required) {
            // Все планеты отсканированы — возвращаемся
            const returnLocation = c.sourcePlanetName
                ? `${c.sourceSectorName}, ${c.sourcePlanetName}`
                : c.sourceSectorName || "базу";
            logs.push({
                message: `${location.planetType} отсканирована! Возвращайтесь на ${returnLocation}`,
                type: "info",
            });
        } else {
            // Ещё нужно сканировать
            logs.push({
                message: `${location.planetType} отсканирована (${newVisited}/${required}). Найдите ещё ${required - newVisited} планет${required - newVisited > 1 ? "ы" : "у"} типа "${c.planetType}"`,
                type: "info",
            });
        }
    });

    return {
        success: true,
        message: logs.length > 0 ? logs[0].message : "",
        logs,
        contracts: newActiveContracts,
    };
};
