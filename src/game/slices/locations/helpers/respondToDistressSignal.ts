import { ARTIFACT_TYPES } from "@/game/constants/artifacts";
import { TRADE_GOODS } from "@/game/constants";
import { findActiveArtifact } from "@/game/artifacts/utils";
import {
    determineSignalOutcome as determineSignalOutcomeHelper,
    getDeepScanChance,
} from "@/game/signals";
import { playSound } from "@/sounds";
import { typedKeys } from "@/lib/utils";
import { store as i18nStore } from "@/lib/useTranslation";
import type {
    SetState,
    GameStore,
    Location,
    CrewMember,
    DistressApproach,
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
    DISTRESS_DEEP_SCAN_MIN_SCAN_RANGE,
    DISTRESS_GUARDED_APPROACH_FUEL_COST,
    DISTRESS_MEDICAL_REPUTATION,
    DISTRESS_MEDICAL_SURVIVOR_JOINS_CHANCE,
    DISTRESS_PROTOCOL_MIN_AVAILABLE_POWER,
} from "../constants";
import { RESEARCH_RESOURCES } from "@/game/constants/research/resources";

/**
 * Обрабатывает сигнал бедствия
 *
 * Сигнал бедствия (distress_signal) — это временная локация, которая появляется
 * случайным образом в секторе космоса. Игрок может ответить на сигнал, что приводит
 * к одному из трёх событий. Перед сближением доступны отдельные протоколы:
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
    approach: DistressApproach = "standard",
): void => {
    const state = get();
    const loc = state.currentLocation;
    const sector = state.currentSector;

    // Validate location
    if (!isValidDistressSignal(loc, sector)) {
        get().addLog(i18nStore.t("distress_signal.logs.not_signal"), "error");
        return;
    }

    if (loc.signalResolved) {
        get().addLog(i18nStore.t("distress_signal.logs.already_resolved"), "warning");
        return;
    }

    if (!validateResponseProtocol(loc, state, approach, get)) {
        return;
    }

    // Determine outcome
    const outcome = determineSignalOutcomeLocal(loc, state);

    if (approach === "guarded") {
        spendGuardedApproachFuel(set);
    }
    if (approach === "medical") {
        consumeMedicine(set);
    }

    // Update location state
    updateLocationState(loc, outcome, approach, set);

    playSound(outcome === "pirate_ambush" ? "combat" : "success");

    // Handle outcome
    handleSignalOutcome(outcome, set, get, approach);

    get().nextTurn();
};

/** Активное сканирование: повторная, но однократная попытка расшифровать сигнал. */
export const deepScanDistressSignal = (
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const loc = state.currentLocation;
    const sector = state.currentSector;

    if (!isValidDistressSignal(loc, sector)) {
        get().addLog(i18nStore.t("distress_signal.logs.not_signal"), "error");
        return;
    }
    if (loc.signalResolved || loc.signalRevealed) {
        get().addLog(i18nStore.t("distress_signal.logs.source_identified"), "warning");
        return;
    }
    if (loc.signalDeepScanUsed) {
        get().addLog(i18nStore.t("distress_signal.logs.deep_scan_used"), "warning");
        return;
    }

    const scanRange = state.getEffectiveScanRange();
    if (scanRange < DISTRESS_DEEP_SCAN_MIN_SCAN_RANGE) {
        get().addLog(i18nStore.t("distress_signal.logs.scanner_required"), "error");
        playSound("error");
        return;
    }
    if (getAvailablePower(state) < DISTRESS_PROTOCOL_MIN_AVAILABLE_POWER) {
        get().addLog(i18nStore.t("distress_signal.logs.deep_scan_power"), "error");
        playSound("error");
        return;
    }

    const scientistLevel = getActiveProfessionLevel(state, "scientist");
    const engineerLevel = getActiveProfessionLevel(state, "engineer");
    const chance = getDeepScanChance(scanRange, scientistLevel, engineerLevel);
    const isDecoded = Math.random() * 100 < chance;
    const outcome = isDecoded
        ? determineSignalOutcomeLocal(loc, state)
        : undefined;

    updateSignalLocation(
        loc,
        {
            signalDeepScanUsed: true,
            ...(outcome
                ? {
                      signalType: outcome,
                      signalRevealed: true,
                      signalRevealChecked: true,
                  }
                : {}),
        },
        set,
    );

    if (outcome) {
        get().addLog(
            i18nStore.t("distress_signal.logs.deep_scan_success", {
                outcome: getSignalOutcomeName(outcome),
            }),
            "info",
        );
        playSound("success");
    } else {
        get().addLog(i18nStore.t("distress_signal.logs.deep_scan_failed"), "warning");
        playSound("error");
    }

    get().nextTurn();
};

/** Отправляет одноразовый зонд, который точно определяет источник сигнала. */
export const probeDistressSignal = (
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const loc = state.currentLocation;
    const sector = state.currentSector;

    if (!isValidDistressSignal(loc, sector)) {
        get().addLog(i18nStore.t("distress_signal.logs.not_signal"), "error");
        return;
    }
    if (loc.signalResolved || loc.signalRevealed) {
        get().addLog(i18nStore.t("distress_signal.logs.source_identified"), "warning");
        return;
    }
    if (state.probes < 1) {
        get().addLog(i18nStore.t("distress_signal.logs.probe_required"), "error");
        playSound("error");
        return;
    }

    const outcome = determineSignalOutcomeLocal(loc, state);
    updateSignalLocation(
        loc,
        {
            signalType: outcome,
            signalRevealed: true,
            signalRevealChecked: true,
        },
        set,
    );
    set((s) => ({ probes: s.probes - 1 }));

    get().addLog(
        i18nStore.t("distress_signal.logs.probe_success", {
            outcome: getSignalOutcomeName(outcome),
        }),
        "info",
    );
    playSound("success");
};

/**
 * Проверяет, является ли локация сигналом бедствия
 */
const isValidDistressSignal = (
    loc: Location | null,
    sector: Sector | null,
): loc is Location & { type: "distress_signal" } => {
    return loc?.type === "distress_signal" && sector !== null;
};

const getAvailablePower = (state: GameStore): number =>
    state.getTotalPower() - state.getTotalConsumption();

const getActiveProfessionLevel = (
    state: GameStore,
    profession: CrewMember["profession"],
): number =>
    state.crew
        .filter((crewMember) =>
            crewMember.profession === profession && crewMember.health > 0,
        )
        .reduce((total, crewMember) => total + crewMember.level, 0);

const getMedicineQuantity = (state: GameStore): number =>
    (state.ship.cargo.find((item) => item.item === "medicine")?.quantity ?? 0) +
    (state.ship.tradeGoods.find((item) => item.item === "medicine")?.quantity ?? 0);

const getSignalOutcomeName = (outcome: SignalType): string => {
    const nameKeys: Record<SignalType, string> = {
        pirate_ambush: "distress_signal.pirate_ambush",
        survivors: "distress_signal.survivors",
        abandoned_cargo: "distress_signal.abandoned_cargo",
    };
    return i18nStore.t(nameKeys[outcome]);
};

const validateResponseProtocol = (
    loc: Location,
    state: GameStore,
    approach: DistressApproach,
    get: () => GameStore,
): boolean => {
    if (approach === "guarded") {
        if (loc.signalRevealed && loc.signalType !== "pirate_ambush") {
            get().addLog(
                i18nStore.t("distress_signal.logs.guarded_known_safe"),
                "warning",
            );
            return false;
        }
        if (getActiveProfessionLevel(state, "engineer") < 1) {
            get().addLog(i18nStore.t("distress_signal.logs.guarded_engineer"), "error");
            playSound("error");
            return false;
        }
        if (state.ship.shields <= 0) {
            get().addLog(i18nStore.t("distress_signal.logs.guarded_shields"), "error");
            playSound("error");
            return false;
        }
        if (getAvailablePower(state) < DISTRESS_PROTOCOL_MIN_AVAILABLE_POWER) {
            get().addLog(i18nStore.t("distress_signal.logs.guarded_power"), "error");
            playSound("error");
            return false;
        }
        if (state.ship.fuel < DISTRESS_GUARDED_APPROACH_FUEL_COST) {
            get().addLog(i18nStore.t("distress_signal.logs.guarded_fuel"), "error");
            playSound("error");
            return false;
        }
    }

    if (approach === "medical") {
        if (!loc.signalRevealed || loc.signalType !== "survivors") {
            get().addLog(
                i18nStore.t("distress_signal.logs.medical_unavailable"),
                "warning",
            );
            return false;
        }
        if (getActiveProfessionLevel(state, "medic") < 1) {
            get().addLog(i18nStore.t("distress_signal.logs.medical_medic"), "error");
            playSound("error");
            return false;
        }
        if (getMedicineQuantity(state) < 1) {
            get().addLog(i18nStore.t("distress_signal.logs.medical_medicine"), "error");
            playSound("error");
            return false;
        }
    }

    return true;
};

const spendGuardedApproachFuel = (set: SetState): void => {
    set((s) => ({
        ship: {
            ...s.ship,
            fuel: s.ship.fuel - DISTRESS_GUARDED_APPROACH_FUEL_COST,
        },
    }));
};

const consumeMedicine = (set: SetState): void => {
    set((s) => {
        const medicineInCargo =
            s.ship.cargo.find((item) => item.item === "medicine")?.quantity ?? 0;
        const fromCargo = Math.min(1, medicineInCargo);
        const fromTradeGoods = 1 - fromCargo;

        return {
            ship: {
                ...s.ship,
                cargo: s.ship.cargo
                    .map((item) =>
                        item.item === "medicine"
                            ? { ...item, quantity: item.quantity - fromCargo }
                            : item,
                    )
                    .filter((item) => item.quantity > 0),
                tradeGoods: s.ship.tradeGoods
                    .map((item) =>
                        item.item === "medicine"
                            ? {
                                  ...item,
                                  quantity: item.quantity - fromTradeGoods,
                              }
                            : item,
                    )
                    .filter((item) => item.quantity > 0),
            },
        };
    });
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
 * Обновляет сигнал в текущем секторе и на карте галактики.
 */
const updateSignalLocation = (
    loc: Location,
    patch: Partial<Location>,
    set: SetState,
): void => {
    const updatedLocation: Location = {
        ...loc,
        ...patch,
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

const updateLocationState = (
    loc: Location,
    outcome: SignalType,
    approach: DistressApproach,
    set: SetState,
): void => {
    updateSignalLocation(
        loc,
        {
            signalType: outcome,
            signalResolved: true,
            signalResponseProtocol: approach,
        },
        set,
    );
};

/**
 * Обрабатывает результат сигнала
 */
const handleSignalOutcome = (
    outcome: SignalType,
    set: SetState,
    get: () => GameStore,
    approach: DistressApproach,
): void => {
    switch (outcome) {
        case "pirate_ambush":
            handlePirateAmbush(get, approach === "guarded");
            break;
        case "survivors":
            handleSurvivors(set, get, approach === "medical");
            break;
        case "abandoned_cargo":
            handleAbandonedCargo(set, get);
            break;
    }
};

/**
 * Обработка пиратской засады
 */
const handlePirateAmbush = (
    get: () => GameStore,
    guardedApproach: boolean,
): void => {
    get().addLog(
        guardedApproach
            ? i18nStore.t("distress_signal.logs.guarded_ambush")
            : "🚨 ЗАСАДА! Это пираты!",
        guardedApproach ? "warning" : "error",
    );

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
        !guardedApproach, // Защитная траектория лишает пиратов первого хода
    );
};

/**
 * Обработка выживших
 * Награда и выживший выдаются сразу при спасении
 */
const handleSurvivors = (
    set: SetState,
    get: () => GameStore,
    medicalProtocol: boolean,
): void => {
    const reward = getRandomReward(SURVIVORS_REWARD);
    const hasCapacity = get().crew.length < get().getCrewCapacity();

    // Медицинский протокол гарантирует образцы и повышает шанс эвакуации.
    const alienBioQty = medicalProtocol
        ? Math.floor(Math.random() * 2) + 1
        : Math.random() < 0.5
          ? Math.floor(Math.random() * 2) + 1
          : 0;
    const survivorJoinChance = medicalProtocol
        ? DISTRESS_MEDICAL_SURVIVOR_JOINS_CHANCE
        : SURVIVOR_JOINS_CHANCE;

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
    if (medicalProtocol) {
        get().addLog(i18nStore.t("distress_signal.logs.medical_stabilized"), "info");
    }
    get().addLog(`Награда за спасение: +${reward}₢`, "info");
    if (alienBioQty > 0) {
        const rd = RESEARCH_RESOURCES["alien_biology"];
        get().addLog(`🔬 ${rd.icon} ${rd.name} x${alienBioQty}`, "info");
    }

    // Медицинская эвакуация даёт больше репутации с доминирующей расой сектора.
    const dominantRace = get().currentSector?.locations
        .find((l) => l.type === "planet" && !l.isEmpty && l.dominantRace)
        ?.dominantRace;
    if (dominantRace) {
        get().changeReputation(
            dominantRace,
            medicalProtocol ? DISTRESS_MEDICAL_REPUTATION : 3,
        );
    }

    // Иногда выживший присоединяется к экипажу
    if (hasCapacity && Math.random() < survivorJoinChance) {
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
