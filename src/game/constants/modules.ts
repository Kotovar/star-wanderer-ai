import type { PartialModuleType } from "../types";

export const MODULE_TYPES: Record<
    PartialModuleType,
    { color: string; borderColor: string }
> = {
    reactor: { color: "#ffb00033", borderColor: "#ffb000" },
    cockpit: { color: "#00d4ff33", borderColor: "#00d4ff" },
    lifesupport: { color: "#00ff4133", borderColor: "#00ff41" },
    cargo: { color: "#ff004033", borderColor: "#ff0040" },
    weaponbay: { color: "#ff00ff33", borderColor: "#ff00ff" },
    shield: { color: "#0080ff33", borderColor: "#0080ff" },
    medical: { color: "#00ffaa33", borderColor: "#00ffaa" },
    scanner: { color: "#ffff0033", borderColor: "#ffff00" },
    engine: { color: "#ff660033", borderColor: "#ff6600" },
    fueltank: { color: "#9933ff33", borderColor: "#9933ff" },
    drill: { color: "#8b451333", borderColor: "#cd853f" },
    ai_core: { color: "#00ffff33", borderColor: "#00ffff" },
    lab: { color: "#00ff4133", borderColor: "#00ff41" },
};

// Lab module stats by level
export const LAB_MODULE_STATS: Record<
    number,
    {
        power: number;
        consumption: number;
        researchOutput: number;
        health: number;
        defense: number;
    }
> = {
    1: { power: 5, consumption: 3, researchOutput: 5, health: 80, defense: 3 },
    2: {
        power: 8,
        consumption: 5,
        researchOutput: 10,
        health: 120,
        defense: 5,
    },
    3: {
        power: 12,
        consumption: 7,
        researchOutput: 20,
        health: 180,
        defense: 8,
    },
};
