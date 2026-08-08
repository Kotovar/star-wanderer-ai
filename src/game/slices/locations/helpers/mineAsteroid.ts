import { toast } from "sonner";
import { store as i18nStore } from "@/lib/useTranslation";
import { ANCIENT_DRILL_BONUS, RESEARCH_RESOURCES } from "@/game/constants";
import { BASE_ENGINEER_EXP } from "@/game/constants/experience";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getMiningResources } from "@/game/research/utils";
import { getStarTypeEffect } from "@/game/constants/starEffects";
import { playSound } from "@/sounds";
import { getCurrentCargo, addTradeGood } from "@/game/slices/ship/helpers";
import {
    ASTEROID_PASSES_BY_TIER,
    ASTEROID_SURFACE_YIELD,
    ASTEROID_TIER,
    BONUS_BASE,
    DRILL_LEVEL_BONUS,
    PERCENT_DIVISOR,
    MIN_CARGO_QUANTITY,
    getDrillWearMultiplier,
} from "../constants";
import { resolveAsteroidPass } from "./resolveAsteroidPass";
import { patchLocation } from "@/game/utils/patchLocation";
import { DEFAULT_MAX_HEALTH_MODULE } from "@/game/constants/modules";
import { getActiveModules } from "@/game/modules/utils";
import type { AsteroidTier, GameState, GameStore, SetState } from "@/game/types";

/** Результат распределения грузового пространства */
interface CargoAllocation {
    addedMinerals: number;
    addedRare: number;
}

// ============================================================================
// Вспомогательные функции
// ============================================================================

/**
 * Распределяет ресурсы по грузовому отсеку с приоритетом редких минералов
 * @param mineralsGained - Полученные минералы
 * @param rareGained - Полученные редкие минералы
 * @param state - Текущее состояние игры
 * @param get - Функция получения состояния
 * @returns Фактически добавленное количество ресурсов
 */
const allocateCargoSpace = (
    mineralsGained: number,
    rareGained: number,
    state: GameState,
    get: () => GameStore,
): CargoAllocation => {
    const currentCargo = getCurrentCargo(state);
    const cargoCapacity = get().getCargoCapacity();
    const cargoSpaceLeft = Math.max(0, cargoCapacity - currentCargo);

    const totalNeeded = mineralsGained + rareGained;

    // Нет места
    if (cargoSpaceLeft === 0) {
        const cargoFullMsg = i18nStore.t("game_logs.mineAsteroid_1");
        get().addLog(cargoFullMsg, "warning");
        toast(cargoFullMsg);
        return { addedMinerals: 0, addedRare: 0 };
    }

    // Всё помещается
    if (totalNeeded <= cargoSpaceLeft) {
        return { addedMinerals: mineralsGained, addedRare: rareGained };
    }

    // Частичное размещение с приоритетом редких минералов
    const scale = cargoSpaceLeft / totalNeeded;
    const addedRare = Math.min(rareGained, Math.max(
        rareGained > 0 ? MIN_CARGO_QUANTITY : 0,
        Math.floor(rareGained * scale),
    ));
    // Минералы заполняют всё оставшееся место
    const addedMinerals = Math.min(mineralsGained, cargoSpaceLeft - addedRare);

    const cargoFullMsg = i18nStore.t("game_logs.mineAsteroid_2", { addedRare: addedMinerals + addedRare, totalNeeded });
    get().addLog(cargoFullMsg, "warning");
    toast(cargoFullMsg);

    return { addedMinerals, addedRare };
};

/**
 * Добавляет исследовательские ресурсы в хранилище
 * @param currentResources - Текущие исследовательские ресурсы
 * @param researchResources - Ресурсы для добавления
 * @returns Обновлённые ресурсы
 */
const addResearchResources = (
    currentResources: Record<string, number>,
    researchResources: Array<{ type: string; quantity: number }>,
): Record<string, number> => {
    return researchResources.reduce(
        (acc, res) => ({
            ...acc,
            [res.type]:
                (currentResources[res.type as keyof typeof currentResources] ||
                    0) + res.quantity,
        }),
        { ...currentResources },
    );
};

// ============================================================================
// Основная функция
// ============================================================================

/**
 * Один проход по поясу астероидов.
 *
 * Механика:
 * - Пояс выдерживает несколько проходов, каждый стоит хода
 * - Залежи глубже богаче, но каждый проход поднимает нестабильность
 * - Столкновение с обломками бьёт по буру — по инструменту, от которого
 *   зависит добыча; добитый бур закрывает пояса до ремонта
 * - Бур ниже тира астероида собирает только поверхность: мало, зато без риска
 * - Ресурсы занимают место в грузовом отсеке
 * - Инженер получает опыт
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const mineAsteroid = (set: SetState, get: () => GameStore): void => {
    const state = get();
    const loc = state.currentLocation;

    // Проверка: это пояс астероидов
    if (!loc || loc.type !== "asteroid_belt") {
        get().addLog( i18nStore.t("game_logs.mineAsteroid_3"), "error");
        return;
    }

    // Проверка: пояс уже выработан
    if (loc.mined) {
        get().addLog( i18nStore.t("game_logs.mineAsteroid_4"), "warning");
        return;
    }

    const drillLevel = get().getDrillLevel();
    const asteroidTier = (loc.asteroidTier || ASTEROID_TIER.BASIC) as AsteroidTier;

    // Без рабочего бура пояс не берётся вовсе — в том числе после столкновения
    if (drillLevel === 0) {
        get().addLog( i18nStore.t("game_logs.mineAsteroid_no_drill"), "error");
        playSound("ui_error");
        return;
    }

    // Бур ниже тира больше не запирает локацию: остаётся поверхностный сбор
    const surfaceOnly = drillLevel < asteroidTier;

    // Проверка наличия инженера
    const hasEngineer = state.crew.some((c) => c.profession === "engineer");
    if (!hasEngineer) {
        get().addLog( i18nStore.t("game_logs.mineAsteroid_6"), "error");
        playSound("ui_error");
        return;
    }

    // Расчёт ресурсов
    const resources = loc.resources || {
        minerals: 0,
        rare: 0,
        credits: 0,
    };

    // Лучший активный бур — он же принимает урон при столкновении
    const drill = getActiveModules(state.ship.modules, "drill").reduce<
        (typeof state.ship.modules)[number] | undefined
    >(
        (best, candidate) =>
            !best || (candidate.level ?? 1) > (best.level ?? 1) ? candidate : best,
        undefined,
    );
    if (!drill) {
        get().addLog( i18nStore.t("game_logs.mineAsteroid_no_drill"), "error");
        playSound("ui_error");
        return;
    }

    // Расчёт бонуса эффективности
    let efficiencyBonus = surfaceOnly ? ASTEROID_SURFACE_YIELD : BONUS_BASE;

    if (!surfaceOnly) {
        // Бонус древнего бура (уровень 4)
        if (drillLevel === 4 && asteroidTier < 4) {
            efficiencyBonus += ANCIENT_DRILL_BONUS[asteroidTier - 1];
        }
        // Бонус за разницу уровней
        else if (drillLevel > asteroidTier) {
            efficiencyBonus += (drillLevel - asteroidTier) * DRILL_LEVEL_BONUS;
        }
    }

    // Износ бура: добитый инструмент копает вдвое хуже целого
    efficiencyBonus *= getDrillWearMultiplier(
        drill.health,
        drill.maxHealth || DEFAULT_MAX_HEALTH_MODULE,
    );

    // Бонус от сращивания ксеноморфа с drill
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.resourceYield) {
        efficiencyBonus *= 1 + mergeBonus.resourceYield / PERCENT_DIVISOR;
    }

    // Бонус от типа звезды текущего сектора (звёздный остаток)
    if (state.currentSector) {
        const starSalvageBonus = getStarTypeEffect(state.currentSector.star.type).salvageYieldBonus ?? 0;
        efficiencyBonus *= 1 + starSalvageBonus;
    }

    const pass = resolveAsteroidPass({
        asteroidTier,
        passesDone: loc.asteroidPassesDone ?? 0,
        instability: loc.asteroidInstability ?? 0,
        resources,
        efficiency: efficiencyBonus,
        surfaceOnly,
        drillHealth: drill.health,
        collisionRoll: Math.random(),
    });

    const mineralsGained = pass.minerals;
    const rareGained = pass.rare;
    const creditsGained = pass.credits;

    // Исследовательские ресурсы
    const researchResources = getMiningResources(drillLevel);

    // Расчёт места в грузовом отсеке
    const { addedMinerals, addedRare } = allocateCargoSpace(
        mineralsGained,
        rareGained,
        state,
        get,
    );

    // Обновление состояния
    set((s) => ({
        credits: s.credits + creditsGained,
        ship: {
            ...s.ship,
            tradeGoods: [addedMinerals, addedRare].reduce(
                (goods, qty, i) =>
                    qty > 0
                        ? addTradeGood(
                              goods,
                              i === 0 ? "minerals" : "rare_minerals",
                              qty,
                          )
                        : goods,
                s.ship.tradeGoods,
            ),
        },
        research: {
            ...s.research,
            resources: addResearchResources(
                s.research.resources,
                researchResources,
            ),
        },
    }));

    // Форматирование исследовательских ресурсов для результата и лога
    const researchLines: string[] = [];
    researchResources.forEach((res) => {
        if (res.quantity > 0) {
            const label = `${RESEARCH_RESOURCES[res.type].icon} ${RESEARCH_RESOURCES[res.type].name} x${res.quantity}`;
            researchLines.push(label);
            get().addLog( i18nStore.t("game_logs.mineAsteroid_7", { label }), "info");
        }
    });

    // Предупреждение о грузе
    const totalGained = mineralsGained + rareGained;
    const totalAdded = addedMinerals + addedRare;
    let cargoWarning: string | undefined;
    if (totalAdded === 0 && totalGained > 0) {
        cargoWarning = "⚠️ Нет места в грузовом отсеке! Ресурсы потеряны.";
    } else if (totalAdded < totalGained) {
        cargoWarning = `⚠️ Недостаточно места! Получено: ${totalAdded} из ${totalGained}т`;
    }

    // Столкновение бьёт по буру — тому самому инструменту, которым идёт добыча
    if (pass.collided) {
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) =>
                    m.id === drill.id
                        ? { ...m, health: pass.nextDrillHealth }
                        : m,
                ),
            },
        }));
    }

    // Итоги пояса копятся между проходами
    const previous = loc.miningResult;
    const accumulated = {
        minerals: (previous?.minerals ?? 0) + addedMinerals,
        rare: (previous?.rare ?? 0) + addedRare,
        credits: (previous?.credits ?? 0) + creditsGained,
        researchResources: [
            ...(previous?.researchResources ?? []),
            ...researchLines,
        ],
        cargoWarning,
        drillDamage: (previous?.drillDamage ?? 0) + pass.drillDamage,
        collided: pass.collided,
    };

    // Через patchLocation, иначе прогресс проходов пропадёт при выходе из
    // локации: currentSector пересобирается из galaxy при возврате, и пояс
    // можно было бы фармить бесконечно.
    set((s) => ({
        ...patchLocation(s, loc.id, {
            mined: pass.exhausted,
            asteroidPassesDone: pass.nextPassesDone,
            asteroidInstability: pass.nextInstability,
            miningResult: accumulated,
        }),
        completedLocations: pass.exhausted
            ? [...s.completedLocations, loc.id]
            : s.completedLocations,
    }));

    playSound("world_mining");

    // Обратная связь по риску: игрок должен понимать, чем платит за глубину
    if (pass.collided) {
        playSound("ui_error");
        get().addLog(
            i18nStore.t("game_logs.mineAsteroid_collision", {
                drillName: drill.name,
                damage: pass.drillDamage,
            }),
            "warning",
        );
    }
    if (pass.drillDestroyed) {
        get().addLog( i18nStore.t("game_logs.mineAsteroid_drill_destroyed"), "error");
    }
    if (surfaceOnly) {
        get().addLog( i18nStore.t("game_logs.mineAsteroid_surface", { asteroidTier, drillLevel }),
            "warning",
        );
    }

    // Логирование результатов
    get().addLog( i18nStore.t("game_logs.mineAsteroid_8", { creditsGained }), "info");
    if (addedRare > 0) get().addLog( i18nStore.t("game_logs.mineAsteroid_9", { rareGained: addedRare }), "info");
    if (addedMinerals > 0) get().addLog( i18nStore.t("game_logs.mineAsteroid_10", { mineralsGained: addedMinerals }), "info");
    if (totalAdded < totalGained) {
        get().addLog( i18nStore.t("game_logs.cargo_overflow", { discarded: totalGained - totalAdded }), "warning");
    }

    // Опыт инженеру — делится между проходами, чтобы полный пояс давал столько же
    const engineer = state.crew.find((c) => c.profession === "engineer");
    if (engineer) {
        get().gainExp(
            engineer,
            Math.max(
                1,
                Math.round(
                    (BASE_ENGINEER_EXP * asteroidTier) /
                        ASTEROID_PASSES_BY_TIER[asteroidTier],
                ),
            ),
        );
    }

    get().nextTurn();
};
