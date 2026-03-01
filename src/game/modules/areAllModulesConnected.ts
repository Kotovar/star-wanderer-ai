import type { Module } from "@/game/types";

export const areAllModulesConnected = (modules: Module[]) => {
    if (modules.length === 0) return true;

    const visited = new Set<number>();
    const queue = [modules[0].id];
    visited.add(modules[0].id);

    while (queue.length > 0) {
        const currentId = queue.shift();
        const current = modules.find((m) => m.id === currentId);
        if (!current) continue;

        for (const other of modules) {
            if (visited.has(other.id)) continue;
            const touchingH =
                (current.x + current.width === other.x ||
                    current.x === other.x + other.width) &&
                current.y < other.y + other.height &&
                current.y + current.height > other.y;
            const touchingV =
                (current.y + current.height === other.y ||
                    current.y === other.y + other.height) &&
                current.x < other.x + other.width &&
                current.x + current.width > other.x;
            if (touchingH || touchingV) {
                visited.add(other.id);
                queue.push(other.id);
            }
        }
    }
    return visited.size === modules.length;
};
