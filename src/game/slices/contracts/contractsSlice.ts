import type { GameStore, SetState, Contract } from "@/game/types";
import {
    processScanContracts as processScanContractsFn,
    completeScanContracts as completeScanContractsFn,
    handleDiplomacyContracts as handleDiplomacyContractsFn,
    handleSupplyRunContracts as handleSupplyRunContractsFn,
    handleGasDiveContracts as handleGasDiveContractsFn,
    handleExpeditionSurveyContracts as handleExpeditionSurveyContractsFn,
    acceptContract as acceptContractFn,
    completeDeliveryContract as completeDeliveryContractFn,
    cancelContract as cancelContractFn,
} from "./helpers";

/**
 * Интерфейс ContractsSlice
 * Содержит методы для управления контрактами
 */
export interface ContractsSlice {
    /**
     * Принимает контракт
     * @param contract - Контракт для принятия
     */
    acceptContract: (contract: Contract) => void;

    /**
     * Выполняет контракт на доставку
     * @param contractId - ID контракта
     */
    completeDeliveryContract: (contractId: string) => void;

    /**
     * Отменяет контракт
     * @param contractId - ID контракта
     */
    cancelContract: (contractId: string) => void;

    /**
     * Обрабатывает сканирование планеты при посещении локации
     */
    processScanContracts: () => ReturnType<
        typeof processScanContractsFn
    >["contracts"];

    /**
     * Завершает выполненные контракты на сканирование
     */
    completeScanContracts: () => void;

    /**
     * Обрабатывает дипломатические контракты при посещении планеты
     */
    handleDiplomacyContracts: (locationIdx: number) => void;

    /**
     * Обрабатывает контракты на поставку при посещении планеты
     */
    handleSupplyRunContracts: (locationIdx: number) => void;

    /**
     * Завершает контракты на сбор мембран при возврате на исходную планету
     */
    handleGasDiveContracts: (locationIdx: number) => void;

    /**
     * Завершает контракты на планетарное исследование при возврате на исходную планету
     */
    handleExpeditionSurveyContracts: (locationIdx: number) => void;
}

/**
 * Создаёт слайс для обработки контрактов
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns Методы для работы с контрактами
 */
export const createContractsSlice = (
    set: SetState,
    get: () => GameStore,
): ContractsSlice => ({
    processScanContracts: () => {
        const state = get();
        const result = processScanContractsFn(state);

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

    completeScanContracts: () => {
        const state = get();
        completeScanContractsFn(state, set, get);
    },

    handleDiplomacyContracts: (locationIdx: number) => {
        const state = get();
        const loc = state.currentSector?.locations[locationIdx];
        if (!loc || loc.type !== "planet") return;

        handleDiplomacyContractsFn(loc, set, get);
    },

    handleSupplyRunContracts: (locationIdx: number) => {
        const state = get();
        const loc = state.currentSector?.locations[locationIdx];
        if (!loc || loc.type !== "planet") return;

        handleSupplyRunContractsFn(loc, set, get);
    },

    handleGasDiveContracts: (locationIdx: number) => {
        const state = get();
        const loc = state.currentSector?.locations[locationIdx];
        if (!loc || loc.type !== "planet") return;

        handleGasDiveContractsFn(loc, set, get);
    },

    handleExpeditionSurveyContracts: (locationIdx: number) => {
        const state = get();
        const loc = state.currentSector?.locations[locationIdx];
        if (!loc || loc.type !== "planet") return;

        handleExpeditionSurveyContractsFn(loc, set, get);
    },

    acceptContract: (contract) => {
        acceptContractFn(contract, set, get);
    },

    completeDeliveryContract: (contractId) => {
        completeDeliveryContractFn(contractId, set, get);
    },

    cancelContract: (contractId) => {
        cancelContractFn(contractId, set, get);
    },
});
