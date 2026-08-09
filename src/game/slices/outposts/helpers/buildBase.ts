import { store as i18nStore } from "@/lib/useTranslation";
import {
    BASE_BUILD_TURNS,
    BASE_COST,
    BASE_MODULES,
    BASE_MODULE_BUILD_TURNS,
    BASE_SLOTS_BY_LEVEL,
    BASE_UPGRADE_COST,
    BASE_UPGRADE_TURNS,
    BASE_MAX_LEVEL,
} from "@/game/constants/baseModules";
import { scheduleWork } from "./construction";
import { planetHasFeature } from "@/game/planets";
import { patchLocation } from "@/game/utils/patchLocation";
import type { GameStore, SetState } from "@/game/types";
import type { BaseModuleId, Outpost } from "@/game/types/outposts";
import { getBaseBlocker } from "./canBuildBase";

const spend = (
    resources: Record<string, number> | undefined,
    held: Record<string, number>,
) =>
    Object.entries(resources ?? {}).reduce(
        (acc, [resource, amount]) => ({
            ...acc,
            [resource]: (acc[resource] ?? 0) - amount,
        }),
        { ...held },
    );

export function buildBase(
    locationId: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const location = state.currentSector?.locations.find(
        (l) => l.id === locationId,
    );

    const blocker = getBaseBlocker(state, location);
    if (blocker) {
        get().addLog(i18nStore.t(`game_logs.outpost_blocked_${blocker}`), "error");
        return;
    }
    if (!location || !state.currentSector) return;

    const outpost: Outpost = {
        id: `base-${locationId}-${state.turn}`,
        kind: "base",
        locationId,
        sectorId: state.currentSector.id,
        builtAtTurn: state.turn,
        bunker: {},
        level: 1,
        modules: [],
        // Ход уходит на закладку, остальное — работы: база оживёт не сразу
        readyAtTurn: state.turn + 1 + BASE_BUILD_TURNS,
    };

    set((s) => ({
        turn: s.turn + 1,
        credits: s.credits - BASE_COST.credits,
        research: {
            ...s.research,
            resources: spend(BASE_COST.resources, s.research.resources),
        },
        outposts: [...s.outposts, outpost],
        ...patchLocation(s, locationId, { outpostId: outpost.id }),
    }));

    get().addLog(
        i18nStore.t("game_logs.outpost_built_base", {
            location: i18nStore.t(location.name),
        }),
        "info",
    );
    get().updateShipStats();
}

/**
 * Почему базу нельзя расширить — или `null`.
 *
 * Отдельной функцией по той же причине, что и `getModuleBlocker`: кнопка
 * обязана гаснуть до нажатия и называть причину на месте. Раньше расширение
 * проверялось только внутри действия, и отказ прилетал в бортжурнал уже
 * после клика — на планетарном экране его не видно вовсе.
 */
export function getUpgradeBlocker(
    state: Pick<GameStore, "credits" | "research">,
    outpost: Outpost,
): "max_level" | "not_enough_credits" | "not_enough_resources" | null {
    const level = outpost.level ?? 1;
    const cost = level < BASE_MAX_LEVEL ? BASE_UPGRADE_COST[level] : null;
    if (!cost) return "max_level";
    if (state.credits < cost.credits) return "not_enough_credits";
    for (const [resource, amount] of Object.entries(cost.resources)) {
        const held =
            state.research.resources[
                resource as keyof typeof state.research.resources
            ] ?? 0;
        if (held < amount) return "not_enough_resources";
    }
    return null;
}

/** Расширение базы: следующий уровень открывает ещё два слота */
export function upgradeBase(
    outpostId: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost || outpost.kind !== "base") return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.outpost_build_remote"), "error");
        return;
    }

    const level = outpost.level ?? 1;
    const blocker = getUpgradeBlocker(state, outpost);
    if (blocker === "max_level") {
        get().addLog(i18nStore.t("game_logs.base_max_level"), "warning");
        return;
    }
    if (blocker) {
        get().addLog(i18nStore.t(`game_logs.outpost_blocked_${blocker}`), "error");
        return;
    }
    const cost = BASE_UPGRADE_COST[level];
    if (!cost) return;

    set((s) => ({
        turn: s.turn + 1,
        credits: s.credits - cost.credits,
        research: {
            ...s.research,
            resources: spend(cost.resources, s.research.resources),
        },
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? {
                      ...o,
                      level: level + 1,
                      readyAtTurn: scheduleWork(
                          o,
                          s.turn + 1,
                          BASE_UPGRADE_TURNS,
                      ),
                  }
                : o,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.base_upgraded", {
            level: level + 1,
            slots: BASE_SLOTS_BY_LEVEL[level + 1],
        }),
        "info",
    );
}

/** Почему модуль нельзя поставить в слот — или `null` */
export function getModuleBlocker(
    state: Pick<GameStore, "credits" | "research">,
    outpost: Outpost,
    moduleId: BaseModuleId,
): "no_slot" | "already_built" | "feature_missing" | "not_enough_credits" | "not_enough_resources" | null {
    const def = BASE_MODULES[moduleId];
    const installed = outpost.modules ?? [];
    if (installed.includes(moduleId)) return "already_built";
    if (installed.length >= (BASE_SLOTS_BY_LEVEL[outpost.level ?? 1] ?? 0)) {
        return "no_slot";
    }
    if (def.requiresFeature && !planetHasFeature(outpost.locationId, def.requiresFeature)) {
        return "feature_missing";
    }
    if (state.credits < def.cost.credits) return "not_enough_credits";
    for (const [resource, amount] of Object.entries(def.cost.resources)) {
        const held =
            state.research.resources[
                resource as keyof typeof state.research.resources
            ] ?? 0;
        if (held < amount) return "not_enough_resources";
    }
    return null;
}

export function installBaseModule(
    outpostId: string,
    moduleId: BaseModuleId,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost) return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.outpost_build_remote"), "error");
        return;
    }

    const blocker = getModuleBlocker(state, outpost, moduleId);
    if (blocker) {
        get().addLog(i18nStore.t(`game_logs.base_module_${blocker}`), "error");
        return;
    }

    const def = BASE_MODULES[moduleId];
    set((s) => ({
        turn: s.turn + 1,
        credits: s.credits - def.cost.credits,
        research: {
            ...s.research,
            resources: spend(def.cost.resources, s.research.resources),
        },
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? {
                      ...o,
                      modules: [...(o.modules ?? []), moduleId],
                      readyAtTurn: scheduleWork(
                          o,
                          s.turn + 1,
                          BASE_MODULE_BUILD_TURNS,
                      ),
                  }
                : o,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.base_module_installed", {
            module: i18nStore.t(`base_modules.${moduleId}.name`),
        }),
        "info",
    );
}

/** Снос модуля: возвращает половину кредитов, материалы сгорают */
export function removeBaseModule(
    outpostId: string,
    moduleId: BaseModuleId,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost?.modules?.includes(moduleId)) return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.outpost_build_remote"), "error");
        return;
    }

    const refund = Math.floor(BASE_MODULES[moduleId].cost.credits / 2);
    set((s) => ({
        credits: s.credits + refund,
        outposts: s.outposts.map((o) =>
            o.id === outpostId
                ? { ...o, modules: (o.modules ?? []).filter((m) => m !== moduleId) }
                : o,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.base_module_removed", {
            module: i18nStore.t(`base_modules.${moduleId}.name`),
            refund,
        }),
        "warning",
    );
}
