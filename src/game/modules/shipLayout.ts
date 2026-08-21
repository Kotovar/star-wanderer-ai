import { ENGINE_MODULE_TYPES } from "@/game/constants/modules";
import type { Module } from "@/game/types";
import { areModulesAdjacent } from "./adjacency";

export const SHIP_EXTERIOR_TARGET_PRIORITY_BONUS = 20;

export type ShipLayoutViolationCode =
    | "missing_spine"
    | "cockpit_front_blocked"
    | "engine_exhaust_blocked"
    | "weapon_exposure_blocked";

export interface ShipLayoutViolation {
    key: string;
    code: ShipLayoutViolationCode;
    moduleId?: number;
}

export interface ShipLayoutAnalysis {
    spineModuleIds: number[];
    exteriorModuleIds: Set<number>;
    violations: ShipLayoutViolation[];
}

const VIOLATION_PRIORITY: Record<ShipLayoutViolationCode, number> = {
    missing_spine: 0,
    cockpit_front_blocked: 1,
    engine_exhaust_blocked: 2,
    weapon_exposure_blocked: 3,
};

const getCenterY = (module: Module) => module.y + module.height / 2;

const compareIdPaths = (left: number[], right: number[]) => {
    for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
        const difference = left[index] - right[index];
        if (difference !== 0) return difference;
    }
    return left.length - right.length;
};

const findSpine = (modules: Module[]) => {
    const moduleById = new Map(modules.map((module) => [module.id, module]));
    const cockpits = modules
        .filter((module) => module.type === "cockpit")
        .sort((left, right) => left.id - right.id);
    const reactors = modules.filter((module) => module.type === "reactor");
    const engines = modules.filter((module) =>
        ENGINE_MODULE_TYPES.includes(module.type),
    );

    if (cockpits.length === 0 || reactors.length === 0 || engines.length === 0) {
        return [];
    }

    const neighbors = new Map<number, number[]>();
    for (const module of modules) {
        neighbors.set(
            module.id,
            modules
                .filter(
                    (candidate) =>
                        candidate.id !== module.id &&
                        areModulesAdjacent(module, candidate),
                )
                .map((candidate) => candidate.id)
                .sort((left, right) => left - right),
        );
    }

    const queue = cockpits.map((cockpit) => [cockpit.id]);
    const candidates: number[][] = [];
    let shortestLength = Number.POSITIVE_INFINITY;

    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
        const path = queue[queueIndex];
        if (path.length > shortestLength) break;

        const cockpit = moduleById.get(path[0]);
        const current = moduleById.get(path[path.length - 1]);
        if (!cockpit || !current) continue;

        if (ENGINE_MODULE_TYPES.includes(current.type)) {
            const engineCenterY = getCenterY(current);
            const hasOrderedReactor = path.slice(1, -1).some((moduleId) => {
                const pathModule = moduleById.get(moduleId);
                return (
                    pathModule?.type === "reactor" &&
                    getCenterY(cockpit) < getCenterY(pathModule) &&
                    getCenterY(pathModule) < engineCenterY
                );
            });

            if (hasOrderedReactor) {
                shortestLength = path.length;
                candidates.push(path);
            }
            continue;
        }

        for (const neighborId of neighbors.get(current.id) ?? []) {
            if (!path.includes(neighborId)) queue.push([...path, neighborId]);
        }
    }

    return candidates.sort(compareIdPaths)[0] ?? [];
};

export function analyzeShipLayout(
    modules: Module[],
    gridSize: number,
): ShipLayoutAnalysis {
    const hullModules = modules.filter((module) => module.type !== "weaponShed");
    const occupied = new Map<string, number>();

    for (const module of hullModules) {
        for (let x = module.x; x < module.x + module.width; x += 1) {
            for (let y = module.y; y < module.y + module.height; y += 1) {
                occupied.set(`${x}:${y}`, module.id);
            }
        }
    }

    const isCellOpen = (x: number, y: number) =>
        x < 0 ||
        y < 0 ||
        x >= gridSize ||
        y >= gridSize ||
        !occupied.has(`${x}:${y}`);

    const exteriorModuleIds = new Set<number>();
    for (const module of hullModules) {
        let isExterior = false;
        for (let x = module.x; x < module.x + module.width && !isExterior; x += 1) {
            for (let y = module.y; y < module.y + module.height; y += 1) {
                if (
                    isCellOpen(x - 1, y) ||
                    isCellOpen(x + 1, y) ||
                    isCellOpen(x, y - 1) ||
                    isCellOpen(x, y + 1)
                ) {
                    isExterior = true;
                    break;
                }
            }
        }
        if (isExterior) exteriorModuleIds.add(module.id);
    }

    const violations: ShipLayoutViolation[] = [];
    const spineModuleIds = findSpine(hullModules);
    if (spineModuleIds.length === 0) {
        violations.push({ key: "missing_spine", code: "missing_spine" });
    }

    for (const module of hullModules) {
        let code: ShipLayoutViolationCode | undefined;

        if (module.type === "cockpit") {
            const hasOpenFront = Array.from({ length: module.width }, (_, offset) =>
                isCellOpen(module.x + offset, module.y - 1),
            ).some(Boolean);
            if (!hasOpenFront) code = "cockpit_front_blocked";
        } else if (ENGINE_MODULE_TYPES.includes(module.type)) {
            const hasOpenExhaust = Array.from(
                { length: module.width },
                (_, offset) =>
                    isCellOpen(module.x + offset, module.y + module.height),
            ).some(Boolean);
            if (!hasOpenExhaust) code = "engine_exhaust_blocked";
        } else if (
            module.type === "weaponbay" &&
            !exteriorModuleIds.has(module.id)
        ) {
            code = "weapon_exposure_blocked";
        }

        if (code) {
            violations.push({
                key: `${code}:${module.id}`,
                code,
                moduleId: module.id,
            });
        }
    }

    violations.sort(
        (left, right) =>
            VIOLATION_PRIORITY[left.code] - VIOLATION_PRIORITY[right.code] ||
            (left.moduleId ?? -1) - (right.moduleId ?? -1),
    );

    return { spineModuleIds, exteriorModuleIds, violations };
}

export function getFirstNewShipLayoutViolation(
    current: ShipLayoutAnalysis,
    prospective: ShipLayoutAnalysis,
) {
    const currentKeys = new Set(current.violations.map(({ key }) => key));
    return prospective.violations.find(({ key }) => !currentKeys.has(key));
}

export function getExteriorTargetPriorityBonus(
    moduleId: number,
    exteriorModuleIds: ReadonlySet<number>,
) {
    return exteriorModuleIds.has(moduleId)
        ? SHIP_EXTERIOR_TARGET_PRIORITY_BONUS
        : 0;
}
