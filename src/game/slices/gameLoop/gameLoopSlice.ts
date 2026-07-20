import type { GameState, GameStore, SetState } from "@/game/types";
import type { CrisisResponse } from "@/game/types/crisis";
import type { RandomEventChoiceId } from "@/game/types/randomEvents";
import {
    initNewTurn,
    processPassiveExperience,
    checkOxygen,
    checkModuleDamage,
    managePower,
    regenerateShields,
    processNaniteRepair,
    processRepairBay,
} from "./helpers";
import * as processors from "./processors";
import { processTravel } from "@/game/slices/travel/helpers";
import { processMarketTick } from "@/game/stations";
import { checkContractExpiry } from "@/game/slices/contracts/helpers/checkContractExpiry";
import { advanceCombatRound } from "@/game/slices/combat/helpers/combatTime";
import { GLOBAL_CRISES } from "@/game/constants/globalCrises";
import { getCrisisResponseDefinition } from "@/game/constants/crisisResponses";
import { store as i18nStore } from "@/lib/useTranslation";

/**
 * Интерфейс GameLoopSlice
 */
export interface GameLoopSlice {
    nextTurn: () => void;
    skipTurn: () => void;
    resolveCrisis: (response: CrisisResponse) => void;
    resolveRandomEvent: (choice: RandomEventChoiceId) => void;
}

/**
 * Создаёт слайс игрового цикла
 */
export const createGameLoopSlice = (
    set: SetState,
    get: () => GameStore,
): GameLoopSlice => ({
    nextTurn: () => {
        if (get().pendingRandomEvent) {
            get().addLog(i18nStore.t("random_events.logs.decision_required"), "warning");
            return;
        }

        const state = get();

        // Инициализация нового хода
        initNewTurn(set);
        const currentTurnState = get();

        // Сбрасываем bonusPower/bonusEvasion до значений из активных планетарных эффектов.
        // Это удаляет устаревшие накопленные значения от назначений экипажа
        // (экипажные бонусы теперь считаются динамически в getTotalPower/getTotalEvasion).
        const activeEffectsNow = get().activeEffects;
        const planetBonusPower = activeEffectsNow
            .flatMap((e) => e.effects)
            .filter((ef) => ef.type === "power_boost")
            .reduce((sum, ef) => sum + Number(ef.value), 0);
        const planetBonusEvasion = activeEffectsNow
            .flatMap((e) => e.effects)
            .filter((ef) => ef.type === "evasion_bonus")
            .reduce((sum, ef) => sum + Math.round(Number(ef.value) * 100), 0);
        set((s) => ({
            ship: {
                ...s.ship,
                bonusPower: planetBonusPower,
                bonusEvasion: planetBonusEvasion,
            },
        }));

        // Пассивный опыт каждые 5 ходов
        processPassiveExperience(state, get);

        // Удаление просроченных эффектов планеты
        get().removeExpiredEffects();
        get().updateShipStats();
        get().processResearch();

        // Проверка кислорода
        const gameOver = checkOxygen(state, get, set);
        if (gameOver) return;

        // Проверка повреждений модулей
        checkModuleDamage(get, set);

        // Управление энергией
        managePower(get, set);

        // Регенерация щитов (штраф от опасной звезды учитывается внутри)
        regenerateShields(state, get, set);

        // Ремонт нанитами (automated_repair / nanite_hull)
        processNaniteRepair(get, set);

        // Ремонтные дроны (repair_bay модули)
        processRepairBay(get, set);

        // Обработка проклятых артефактов
        processors.processCursedArtifacts(state, set, get);

        // Обработка положительных эффектов артефактов
        processors.processArtifactEffects(state, set, get);

        // Дезертирство экипажа
        processors.processDesertion(set, get);

        // Проверка конца игры после ухода экипажа
        get().checkGameOver();

        // Проверка истечения расовых контрактов
        checkContractExpiry(set, get);

        // Тик рынка: дрейф цен и пополнение складов станций
        processMarketTick(set, get);

        // Путешествия
        processTravel(state, set, get);

        // Случайные события
        processors.processRandomEvents(state, set, get);

        // Глобальные кризисы
        processors.processGlobalCrises(currentTurnState, set, get);

        // Назначения экипажа
        processors.processCrewAssignments(set, get);

        // Трейты морали и прочее
        processors.processMoraleTraits(set, get);
        processors.processOvercrowding(set, get);
        processors.processUnhappyCrew(set, get);
        processors.processPowerCheck(set, get);
        processors.processExpeditionFatigue(set);

        // Сохранение
        get().updateShipStats();
        get().checkVictory();
        get().saveGame();
    },

    skipTurn: () => {
        if (get().pendingRandomEvent) {
            get().addLog(i18nStore.t("random_events.logs.decision_required"), "warning");
            return;
        }

        if (get().currentCombat) {
            get().addLog("Боевой раунд пропущен - враг атакует", "combat");
            get().processEnemyAttack();
            advanceCombatRound(
                set as unknown as (fn: (state: GameState) => void) => void,
                get,
            );
            return;
        }

        get().addLog("Ход пропущен - задачи выполняются", "info");
        get().nextTurn();
    },

    resolveRandomEvent: (choice) =>
        processors.resolveRandomEvent(choice, set, get),

    resolveCrisis: (response) => {
        const state = get();
        const activeCrisis = state.activeCrisis;
        if (!activeCrisis) return;

        const crisis = GLOBAL_CRISES.find((item) => item.id === activeCrisis.id);
        const responseDefinition = getCrisisResponseDefinition(response);
        if (!crisis?.allowedResponses.includes(response)) {
            get().addLog(
                `Кризис: ${responseDefinition.label.toLowerCase()} не подходит для этой угрозы`,
                "warning",
            );
            return;
        }
        if (!responseDefinition.pay(state, set)) {
            get().addLog(
                `Кризис: не хватает условий для решения через ${responseDefinition.label.toLowerCase()}`,
                "warning",
            );
            return;
        }

        if (Math.random() > responseDefinition.getChance(state)) {
            get().addLog(
                `Кризис: ${responseDefinition.label.toLowerCase()} не сработал, кризис продолжается`,
                "warning",
            );
            get().saveGame();
            return;
        }

        crisis?.onEndEffect?.(set, get, activeCrisis);
        set(() => ({ activeCrisis: null }));
        get().addLog(
            `✅ Кризис подавлен: ${crisis?.icon ?? ""} ${crisis ? i18nStore.t(crisis.nameKey) : ""} через ${responseDefinition.label.toLowerCase()}`,
            "info",
        );
        get().saveGame();
    },
});
