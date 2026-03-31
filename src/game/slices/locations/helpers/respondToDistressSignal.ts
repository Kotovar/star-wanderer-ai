import { ARTIFACT_TYPES } from "@/game/constants/artifacts";
import { TRADE_GOODS } from "@/game/constants";
import { findActiveArtifact } from "@/game/artifacts/utils";
import { determineSignalOutcome as determineSignalOutcomeHelper } from "@/game/signals";
import { playSound } from "@/sounds";
import { typedKeys } from "@/lib/utils";
import type {
    SetState,
    GameStore,
    Location,
    CrewMember,
    SignalType,
    RaceId,
    Sector,
} from "@/game/types";
import { buildCrewMember } from "@/game/crew/buildCrewMember";
import { rollQuality } from "@/game/crew/utils";
import { addTradeGood } from "@/game/slices/ship/helpers";
import {
    SURVIVORS_REWARD,
    SURVIVOR_JOINS_CHANCE,
    ABANDONED_CARGO_CREDITS,
    ABANDONED_CARGO_QUANTITY,
    ABANDONED_CARGO_ARTIFACT_CHANCE,
} from "../constants";
import { RESEARCH_RESOURCES } from "@/game/constants/research/resources";

/**
 * Обрабатывает сигнал бедствия
 *
 * Сигнал бедствия (distress_signal) — это временная локация, которая появляется
 * случайным образом в секторе космоса. Игрок может ответить на сигнал, что приводит
 * к одному из трёх событий:
 * - Пиратская засада (бой с пиратами)
 * - Спасение выживших (награда 150-300₢ сразу + 30% шанс получить нового члена экипажа)
 * - Заброшенный груз (кредиты + товары + шанс найти артефакт)
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const respondToDistressSignal = (
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const loc = state.currentLocation;
    const sector = state.currentSector;

    // Validate location
    if (!isValidDistressSignal(loc, sector)) {
        get().addLog("Это не сигнал бедствия!", "error");
        return;
    }

    if (loc.signalResolved) {
        get().addLog("Сигнал уже обработан!", "warning");
        return;
    }

    // Determine outcome
    const outcome = determineSignalOutcomeLocal(loc, state);

    // Update location state
    updateLocationState(loc, outcome, set);

    // Play combat sound
    playSound("combat");

    // Handle outcome
    handleSignalOutcome(outcome, set, get);

    get().nextTurn();
};

/**
 * Проверяет, является ли локация сигналом бедствия
 */
const isValidDistressSignal = (
    loc: Location | null,
    sector: Sector | null,
): loc is Location & { type: "distress_signal" } => {
    return loc?.type === "distress_signal" && sector !== undefined;
};

/**
 * Определяет результат сигнала с учётом артефактов
 */
const determineSignalOutcomeLocal = (
    loc: Location,
    state: GameStore,
): SignalType => {
    // Use existing signalType if revealed by scanner
    if (loc.signalType) {
        return loc.signalType;
    }

    // Eye of Singularity increases ambush chance by 50%
    const allSeeing = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.EYE_OF_SINGULARITY,
    );
    const ambushModifier = allSeeing ? 0.5 : 0;

    return determineSignalOutcomeHelper(ambushModifier);
};

/**
 * Обновляет состояние локации
 */
const updateLocationState = (
    loc: Location,
    outcome: SignalType,
    set: SetState,
): void => {
    const updatedLocation = {
        ...loc,
        signalType: outcome,
        signalResolved: true,
    };

    set((s) => {
        const updatedSector = s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map((l) =>
                      l.id === loc.id ? updatedLocation : l,
                  ),
              }
            : null;

        return {
            currentLocation: updatedLocation,
            currentSector: updatedSector,
            galaxy: {
                ...s.galaxy,
                sectors: s.galaxy.sectors.map((sec) =>
                    sec.id === s.currentSector?.id && updatedSector
                        ? updatedSector
                        : sec,
                ),
            },
        };
    });
};

/**
 * Обрабатывает результат сигнала
 */
const handleSignalOutcome = (
    outcome: SignalType,
    set: SetState,
    get: () => GameStore,
): void => {
    switch (outcome) {
        case "pirate_ambush":
            handlePirateAmbush(get);
            break;
        case "survivors":
            handleSurvivors(set, get);
            break;
        case "abandoned_cargo":
            handleAbandonedCargo(set, get);
            break;
    }
};

/**
 * Обработка пиратской засады
 */
const handlePirateAmbush = (get: () => GameStore): void => {
    get().addLog("🚨 ЗАСАДА! Это пираты!", "error");

    const state = get();
    const tier = state.currentSector?.tier ?? 1;
    const threat = Math.min(3, tier + 1);

    get().startCombat(
        {
            id: `enemy-${Date.now()}`,
            type: "enemy",
            name: "Пираты",
            threat,
        },
        true, // isAmbush = true - pirates attack first
    );
};

/**
 * Обработка выживших
 * Награда и выживший выдаются сразу при спасении
 */
const handleSurvivors = (set: SetState, get: () => GameStore): void => {
    const reward = getRandomReward(SURVIVORS_REWARD);
    const hasCapacity = get().crew.length < get().getCrewCapacity();

    // Биологические образцы от выживших (50% шанс)
    const alienBioQty = Math.random() < 0.5 ? Math.floor(Math.random() * 2) + 1 : 0;

    // Выдаём награду сразу
    set((s) => {
        const updatedResources = { ...s.research.resources };
        if (alienBioQty > 0) {
            updatedResources.alien_biology = (updatedResources.alien_biology || 0) + alienBioQty;
        }
        return {
            credits: s.credits + reward,
            research: { ...s.research, resources: updatedResources },
        };
    });

    get().addLog("✓ Выжившие спасены!", "info");
    get().addLog(`Награда за спасение: +${reward}₢`, "info");
    if (alienBioQty > 0) {
        const rd = RESEARCH_RESOURCES["alien_biology"];
        get().addLog(`🔬 ${rd.icon} ${rd.name} x${alienBioQty}`, "info");
    }

    // +3 репутации с доминирующей расой сектора за спасение
    const dominantRace = get().currentSector?.locations
        .find((l) => l.type === "planet" && !l.isEmpty && l.dominantRace)
        ?.dominantRace;
    if (dominantRace) {
        get().changeReputation(dominantRace, 3);
    }

    // Иногда выживший присоединяется к экипажу
    if (hasCapacity && Math.random() < SURVIVOR_JOINS_CHANCE) {
        addSurvivorToCrew(set, get);
    }

    markLocationCompleted(set, get);
};

/**
 * Добавляет выжившего в очередь ожидания (pendingSurvivor).
 * Использует то же качество/трейты/расу, что и генерация экипажа на станции,
 * но уровень всегда 1.
 */
const addSurvivorToCrew = (set: SetState, get: () => GameStore): void => {
    const lifesupportModule = get().ship.modules.find(
        (m) => m.type === "lifesupport",
    );
    const initialModuleId =
        lifesupportModule?.id || get().ship.modules[0]?.id || 1;

    const seed = Date.now();
    const quality = rollQuality(Math.abs(Math.sin(seed) * 10000) % 1);

    const newCrew: CrewMember = buildCrewMember({
        race: "random",
        excludeRaces: ["synthetic"],
        profession: "random",
        excludeProfessions: ["gunner"],
        level: 1,
        traits: quality,
        seed,
        moduleId: initialModuleId,
    });

    set(() => ({ pendingSurvivor: newCrew }));
    get().addLog(
        `Выживший ${newCrew.name} (${getRaceName(newCrew.race)}) просит принять его на борт.`,
        "info",
    );
};

/**
 * Получает название расы для отображения
 */
const getRaceName = (raceId: RaceId): string => {
    const raceNames: Record<RaceId, string> = {
        human: "Человек",
        synthetic: "Синтетик",
        xenosymbiont: "Ксеноморф",
        voidborn: "Рождённый в Пустоте",
        crystalline: "Кристаллоид",
        krylorian: "Крилорианец",
    };
    return raceNames[raceId] || raceId;
};

/**
 * Обработка заброшенного груза
 */
const handleAbandonedCargo = (set: SetState, get: () => GameStore): void => {
    const creditsReward = getRandomReward(ABANDONED_CARGO_CREDITS);
    const keys = typedKeys(TRADE_GOODS);
    const goodId = keys[Math.floor(Math.random() * keys.length)];
    const quantity = getRandomQuantity(ABANDONED_CARGO_QUANTITY);
    const goodName = TRADE_GOODS[goodId].name;

    // Технологический лом из заброшенного груза (гарантировано 1–3)
    const techSalvageQty = Math.floor(Math.random() * 3) + 1;

    set((s) => {
        const updatedResources = { ...s.research.resources };
        updatedResources.tech_salvage = (updatedResources.tech_salvage || 0) + techSalvageQty;
        return {
            credits: s.credits + creditsReward,
            ship: {
                ...s.ship,
                tradeGoods: addTradeGood(s.ship.tradeGoods, goodId, quantity),
            },
            research: { ...s.research, resources: updatedResources },
        };
    });

    get().addLog("📦 Найден заброшенный груз!", "info");
    get().addLog(`Кредиты: +${creditsReward}₢`, "info");
    get().addLog(`${goodName}: +${quantity}`, "info");
    const rdSalvage = RESEARCH_RESOURCES["tech_salvage"];
    get().addLog(`🔬 ${rdSalvage.icon} ${rdSalvage.name} x${techSalvageQty}`, "info");

    // Chance to find artifact
    const artifact = get().tryFindArtifact();
    let foundArtifact: string | undefined;
    if (artifact && Math.random() < ABANDONED_CARGO_ARTIFACT_CHANCE) {
        get().addLog(`★ АРТЕФАКТ НАЙДЕН: ${artifact.name}!`, "info");
        foundArtifact = artifact.name;
    }

    // Update location with loot details
    updateLocationWithLoot(set, get, {
        credits: creditsReward,
        tradeGood: { name: goodName, quantity },
        artifact: foundArtifact,
    });

    markLocationCompleted(set, get);
};

/**
 * Обновляет локацию с информацией о найденном грузе
 */
const updateLocationWithLoot = (
    set: SetState,
    get: () => GameStore,
    loot: {
        credits: number;
        tradeGood: { name: string; quantity: number };
        artifact?: string;
    },
): void => {
    const loc = get().currentLocation;
    if (!loc) return;

    const updatedLocation = {
        ...loc,
        signalLoot: loot,
    };

    set((s) => {
        const updatedSector = s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map((l) =>
                      l.id === loc.id ? updatedLocation : l,
                  ),
              }
            : null;

        return {
            currentLocation: updatedLocation,
            currentSector: updatedSector,
            galaxy: {
                ...s.galaxy,
                sectors: s.galaxy.sectors.map((sec) =>
                    sec.id === s.currentSector?.id && updatedSector
                        ? updatedSector
                        : sec,
                ),
            },
        };
    });
};

/**
 * Отмечает локацию как завершённую
 */
const markLocationCompleted = (set: SetState, get: () => GameStore): void => {
    const loc = get().currentLocation;
    if (!loc) return;

    set((s) => ({
        completedLocations: [...s.completedLocations, loc.id],
    }));
};

/**
 * Генерирует случайную награду в диапазоне
 */
const getRandomReward = (range: { MIN: number; MAX: number }): number => {
    return range.MIN + Math.floor(Math.random() * (range.MAX - range.MIN));
};

/**
 * Генерирует случайное количество в диапазоне
 */
const getRandomQuantity = (range: { MIN: number; MAX: number }): number => {
    return range.MIN + Math.floor(Math.random() * (range.MAX - range.MIN));
};
