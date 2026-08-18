import { toast } from "sonner";
import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState, Contract, ContractCompletionResult, FactionDeliveryChoice } from "@/game/types";
import {
    processScanContracts as processScanContractsFn,
    completeScanContracts as completeScanContractsFn,
    handleDiplomacyContracts as handleDiplomacyContractsFn,
    handleSupplyRunContracts as handleSupplyRunContractsFn,
    handleGasDiveContracts as handleGasDiveContractsFn,
    handleExpeditionSurveyContracts as handleExpeditionSurveyContractsFn,
    handleCrisisResponseContracts as handleCrisisResponseContractsFn,
    handleFabricationContracts as handleFabricationContractsFn,
    acceptContract as acceptContractFn,
    completeDeliveryContract as completeDeliveryContractFn,
    resolveFactionDeliveryDecision as resolveFactionDeliveryDecisionFn,
    cancelContract as cancelContractFn,
} from "./helpers";
import { refreshVisitedPlanetContracts } from "@/game/contracts/refreshPlanetContracts";
import {
    FRONTIER_CONTRACT_TARGET,
    getFrontierContactPatch,
    hasCombatArmament,
} from "@/game/contracts/frontierContracts";

/**
 * Интерфейс ContractsSlice
 * Содержит методы для управления контрактами
 */
export interface ContractsSlice {
    /**
     * Принимает контракт
     * @param contract - Контракт для принятия
     */
    acceptContract: (contract: Contract) => boolean;

    /**
     * Выполняет контракт на доставку
     * @param contractId - ID контракта
     */
    completeDeliveryContract: (contractId: string) => void;

    resolveFactionDeliveryDecision: (choice: FactionDeliveryChoice) => void;

    /**
     * Отменяет контракт
     * @param contractId - ID контракта
     */
    cancelContract: (contractId: string) => void;

    showContractCompletion: (completion: ContractCompletionResult) => void;
    dismissContractCompletion: () => void;

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

    /** Завершает контракты на планетарное исследование у заказчика. */
    handleExpeditionSurveyContracts: (locationIdx: number) => void;
    handleCrisisResponseContracts: (locationIdx: number) => void;
    handleFabricationContracts: (locationIdx: number) => void;
    syncCombatContractOffers: () => void;
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
    showContractCompletion: (completion) => {
        const current = get();
        const isFrontierCompletion =
            completion.contract.progressionTrack === "frontier" &&
            !current.frontierChainClosed;
        const frontierContractsCompleted = isFrontierCompletion
            ? current.frontierContractsCompleted + 1
            : current.frontierContractsCompleted;
        const frontierChainClosed =
            current.frontierChainClosed ||
            frontierContractsCompleted >= FRONTIER_CONTRACT_TARGET;
        const contactPatch =
            isFrontierCompletion &&
            frontierContractsCompleted === FRONTIER_CONTRACT_TARGET
                ? getFrontierContactPatch({
                      ...current,
                      frontierContractsCompleted,
                      frontierChainClosed,
                  })
                : null;

        if (isFrontierCompletion) {
            set(() => ({
                frontierContractsCompleted,
                frontierChainClosed,
                ...(contactPatch ?? {}),
            }));
        }
        if (contactPatch) {
            get().addLog(i18nStore.t("game_logs.frontier_military_contact"), "info");
        }
        set((state) => ({
            pendingContractCompletions: [
                ...state.pendingContractCompletions,
                completion,
            ],
        }));
        get().saveGame();
    },

    dismissContractCompletion: () => {
        set((state) => ({
            pendingContractCompletions:
                state.pendingContractCompletions.slice(1),
        }));
        get().saveGame();
    },

    syncCombatContractOffers: () => {
        const state = get();
        if (
            !hasCombatArmament(state.ship.modules) ||
            state.frontierCombatOffersSeeded
        ) {
            return;
        }

        set((current) => ({
            frontierCombatOffersSeeded: true,
            ...(current.frontierContractsCompleted < FRONTIER_CONTRACT_TARGET
                ? { frontierChainClosed: true }
                : {}),
        }));

        const refreshed = refreshVisitedPlanetContracts(get(), {
            ensureCombatOffer: true,
        });
        if (refreshed) {
            set((current) => ({
                galaxy: { ...current.galaxy, sectors: refreshed },
            }));
        }
    },

    processScanContracts: () => {
        const state = get();
        const result = processScanContractsFn(state);

        // Логируем сообщения только если есть контракты на сканирование
        if (result.logs) {
            result.logs.forEach((log) => {
                const fullMessage = i18nStore.t("game_logs.contractsSlice_1", { message: log.message });
                get().addLog(fullMessage, log.type, log.category);
                if (log.toast) toast(fullMessage);
            });
        }

        // Обновляем контракты если есть изменения
        if (result.contracts !== state.activeContracts) {
            set(() => ({ activeContracts: result.contracts }));
            get().saveGame();
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
        // Поставки принимают и планеты, и дружественные корабли (их квесты)
        if (!loc || (loc.type !== "planet" && loc.type !== "friendly_ship"))
            return;

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
        if (!loc || (loc.type !== "planet" && loc.type !== "friendly_ship"))
            return;

        handleExpeditionSurveyContractsFn(loc, set, get);
    },

    handleCrisisResponseContracts: (locationIdx: number) => {
        const state = get();
        const loc = state.currentSector?.locations[locationIdx];
        if (!loc || loc.type !== "planet") return;

        handleCrisisResponseContractsFn(loc, set, get);
    },

    handleFabricationContracts: (locationIdx: number) => {
        const state = get();
        const loc = state.currentSector?.locations[locationIdx];
        if (!loc || loc.type !== "planet") return;

        handleFabricationContractsFn(loc, set, get);
    },

    acceptContract: (contract) => {
        const accepted = acceptContractFn(contract, set, get);
        if (accepted) get().saveGame();
        return accepted;
    },

    completeDeliveryContract: (contractId) => {
        completeDeliveryContractFn(contractId, set, get);
    },

    resolveFactionDeliveryDecision: (choice) => {
        resolveFactionDeliveryDecisionFn(choice, set, get);
    },

    cancelContract: (contractId) => {
        const exists = get().activeContracts.some(
            (contract) => contract.id === contractId,
        );
        cancelContractFn(contractId, set, get);
        if (exists) get().saveGame();
    },
});
