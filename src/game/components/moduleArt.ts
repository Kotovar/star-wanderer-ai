import type { Module } from "../types";

export const MODULE_ART: Partial<
    Record<Module["type"], Partial<Record<string, string>>>
> = {
    reactor: {
        "1x1": "/assets/modules/reactor-1x1.webp",
        "2x1": "/assets/modules/reactor-2x1.webp",
    },
    cockpit: { "1x1": "/assets/modules/cockpit-1x1.webp" },
    engine: {
        "1x1": "/assets/modules/engine-1x1.webp",
        "2x2": "/assets/modules/engine-2x2.webp",
    },
    lifesupport: { "1x1": "/assets/modules/lifesupport-1x1.webp" },
    cargo: {
        "1x1": "/assets/modules/cargo-1x1.webp",
        "2x1": "/assets/modules/cargo-2x1.webp",
    },
    weaponbay: {
        "1x1": "/assets/modules/weaponbay-1x1.webp",
        "2x1": "/assets/modules/weaponbay-2x1.webp",
        "2x2": "/assets/modules/weaponbay-2x2.webp",
    },
    shield: {
        "1x1": "/assets/modules/shield-1x1.webp",
        "2x1": "/assets/modules/shield-2x1.webp",
    },
    medical: { "1x1": "/assets/modules/medical-1x1.webp" },
    scanner: { "1x1": "/assets/modules/scanner-1x1.webp" },
    fueltank: { "1x1": "/assets/modules/fueltank-1x1.webp" },
    drill: {
        "1x1": "/assets/modules/drill-1x1.webp",
        "1x2": "/assets/modules/drill-1x2.webp",
    },
    ai_core: { "2x2": "/assets/modules/ai_core-2x2.webp" },
    lab: { "2x2": "/assets/modules/lab-2x2.webp" },
    quarters: {
        "1x1": "/assets/modules/quarters-1x1.webp",
        "1x2": "/assets/modules/quarters-1x2.webp",
        "2x2": "/assets/modules/quarters-2x2.webp",
    },
    repair_bay: {
        "1x1": "/assets/modules/repair_bay-1x1.webp",
        "1x2": "/assets/modules/repair_bay-1x2.webp",
        "2x2": "/assets/modules/repair_bay-2x2.webp",
    },
    bio_research_lab: {
        "2x2": "/assets/modules/bio_research_lab-2x2.webp",
    },
    pulse_drive: { "2x2": "/assets/modules/pulse_drive-2x2.webp" },
    habitat_module: {
        "2x2": "/assets/modules/habitat_module-2x2.webp",
    },
    deep_survey_array: {
        "2x2": "/assets/modules/deep_survey_array-2x2.webp",
    },
};

export function getModuleImageUrl(
    type: Module["type"],
    width: number,
    height: number,
): string | undefined {
    return MODULE_ART[type]?.[`${width}x${height}`];
}
