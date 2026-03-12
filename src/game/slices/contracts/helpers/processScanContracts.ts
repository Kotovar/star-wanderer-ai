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
        // Проверяем, не было ли уже посещения этой планеты по этому контракту
        if (c.visited && c.visited >= 1) {
            logs.push({
                message: "планета уже отсканирована по этому контракту",
                type: "info",
            });
            return;
        }

        const updated = { ...c, visited: (c.visited || 0) + 1 };
        newActiveContracts = newActiveContracts.map((ac) =>
            ac.id === c.id ? updated : ac,
        );

        // Формируем название планеты для возврата
        const returnLocation = c.sourcePlanetName
            ? `${c.sourceSectorName}, ${c.sourcePlanetName}`
            : c.sourceSectorName || "базу";

        logs.push({
            message: `${location.planetType} отсканирована! Возвращайтесь на ${returnLocation}`,
            type: "info",
        });
    });

    return {
        success: true,
        message: logs.length > 0 ? logs[0].message : "",
        logs,
        contracts: newActiveContracts,
    };
};
