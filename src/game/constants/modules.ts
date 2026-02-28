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
};
