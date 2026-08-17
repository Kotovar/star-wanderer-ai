import type { GameState, LogCategory, LogEntry } from "@/game/types";
import { isModuleActive } from "@/game/modules/utils";
import { store as i18nStore } from "@/lib/useTranslation";
import { getLocationName, getPlanetTypeName } from "@/lib/translationHelpers";

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
    const logs: {
        message: string;
        type: LogEntry["type"];
        category: LogCategory;
        toast?: boolean;
    }[] = [];

    scanContracts.forEach((c) => {
        const required = c.requiresVisit ?? 1;
        const t = i18nStore.t.bind(i18nStore);
        const currentPlanetType = getPlanetTypeName(
            location.planetType ?? "",
            t,
        );
        const targetPlanetType = getPlanetTypeName(c.planetType ?? "", t);

        // Проверяем, не выполнен ли уже контракт
        if (c.visited && c.visited >= required) {
            logs.push({
                message: i18nStore.t("game_logs.scan_contract_already_scanned"),
                type: "info",
                category: "contracts",
            });
            return;
        }

        // Каждая планета засчитывается один раз — повторный визит не фармится
        if (c.scannedPlanetIds?.includes(location.id)) {
            logs.push({
                message: i18nStore.t("game_logs.scan_contract_duplicate_planet"),
                type: "info",
                category: "contracts",
            });
            return;
        }

        const newVisited = (c.visited || 0) + 1;
        const updated = {
            ...c,
            visited: newVisited,
            scannedPlanetIds: [...(c.scannedPlanetIds ?? []), location.id],
        };
        newActiveContracts = newActiveContracts.map((ac) =>
            ac.id === c.id ? updated : ac,
        );

        if (newVisited >= required) {
            // Все планеты отсканированы — возвращаемся
            const returnLocation = c.sourcePlanetName
                ? `${getLocationName(c.sourceSectorName ?? "", t)}, ${getLocationName(c.sourcePlanetName, t)}`
                : c.sourceName && c.sourceSectorName
                  ? `${c.sourceName} (${getLocationName(c.sourceSectorName, t)})`
                  : getLocationName(
                        c.sourceSectorName ||
                            i18nStore.t("game_logs.scan_contract_base"),
                        t,
                    );
            logs.push({
                message: i18nStore.t("game_logs.scan_contract_complete", {
                    planetType: currentPlanetType,
                    returnLocation,
                }),
                type: "info",
                category: "contracts",
                toast: true,
            });
        } else {
            // Ещё нужно сканировать
            logs.push({
                message: i18nStore.t("game_logs.scan_contract_progress", {
                    planetType: currentPlanetType,
                    visited: newVisited,
                    required,
                    remaining: required - newVisited,
                    targetPlanetType,
                }),
                type: "info",
                category: "contracts",
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
