import {
    processScanContracts,
    completeScanContracts,
    handleDiplomacyContracts,
    handleSupplyRunContracts,
} from "./helpers";
import { giveCrewExperience } from "@/game/crew";
import type { GameState, GameStore } from "@/game/types";

// Тип для set с поддержкой immer (позволяет и мутации, и объекты)
type SetState = {
    (
        partial:
            | Partial<GameState>
            | ((state: GameState) => Partial<GameState>),
    ): void;
};

/**
 * Создаёт слайс для обработки контрактов
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns Методы для работы с контрактами
 */
export const createScanContractsSlice = (
    set: SetState,
    get: () => GameStore,
) => ({
    /**
     * Обрабатывает сканирование планеты при посещении локации
     * Проверяет контракты на сканирование и обновляет прогресс
     * @returns Обновлённый список активных контрактов
     */
    processScanContracts: () => {
        const state = get();
        const result = processScanContracts(state);

        // Логируем сообщения только если есть контракты на сканирование
        if (result.logs) {
            result.logs.forEach((log) => {
                get().addLog(`📡 Сканирование: ${log.message}`, log.type);
            });
        }

        // Обновляем контракты если есть изменения
        if (result.contracts !== state.activeContracts) {
            set(() => ({ activeContracts: result.contracts }));
        }

        return result.contracts;
    },

    /**
     * Завершает выполненные контракты на сканирование
     * Вызывается при возврате на базовую планету после сканирования
     */
    completeScanContracts: () => {
        const state = get();
        const result = completeScanContracts(state);

        if (!result.success || result.completed.length === 0) {
            return;
        }

        result.completed.forEach((contract) => {
            set((s) => ({
                credits: s.credits + contract.reward,
                completedContractIds: [...s.completedContractIds, contract.id],
                activeContracts: s.activeContracts.filter(
                    (ac) => ac.id !== contract.id,
                ),
            }));

            get().addLog(
                `📡 Контракт выполнен: ${contract.desc} +${contract.reward}₢`,
                "info",
            );

            giveCrewExperience(
                contract.expReward,
                `Экипаж получил опыт: +${contract.expReward} ед.`,
            );
        });
    },

    /**
     * Обрабатывает дипломатические контракты при посещении планеты
     * @param locationIdx - Индекс локации в текущем секторе
     */
    handleDiplomacyContracts: (locationIdx: number) => {
        const state = get();
        const loc = state.currentSector?.locations[locationIdx];
        if (!loc || loc.type !== "planet") return;

        handleDiplomacyContracts(loc, set, get);
    },

    /**
     * Обрабатывает контракты на поставку при посещении планеты
     * @param locationIdx - Индекс локации в текущем секторе
     */
    handleSupplyRunContracts: (locationIdx: number) => {
        const state = get();
        const loc = state.currentSector?.locations[locationIdx];
        if (!loc || loc.type !== "planet") return;

        handleSupplyRunContracts(loc, set, get);
    },
});
