import { store as i18nStore } from "@/lib/useTranslation";
import type { SetState, GameStore } from "@/game/types";
import type { ExpeditionState } from "@/game/types/exploration";
import { PLANET_POINT_OF_INTERESTS } from "@/game/constants/planets";
import { isModuleActive } from "@/game/modules/utils";
import { getTechBonusSum } from "@/game/research";
import { generateExpeditionGrid } from "./generateExpeditionGrid";
import {
    EXPEDITION_SCANS_PER_SCIENTIST,
    getExpeditionEnvironment,
} from "./constants";

/**
 * Начинает экспедицию на поверхность планеты.
 * AP = количество членов экипажа + бонус технологии + бонус синтетиков.
 * Ход не тратится — только финальный endExpedition стоит 1 ход.
 */
export function startExpedition(
    planetId: string,
    crewIds: number[],
    set: SetState,
    get: () => GameStore,
): void {
    if (crewIds.length === 0) {
        get().addLog( i18nStore.t("game_logs.startExpedition_1"), "error");
        return;
    }

    const state = get();
    const planet = state.currentSector?.locations.find((l) => l.id === planetId);
    if (!planet) {
        get().addLog( i18nStore.t("game_logs.startExpedition_2"), "error");
        return;
    }

    if (planet.isEmpty && !planet.explored) {
        get().addLog( i18nStore.t("game_logs.startExpedition_3"), "error");
        return;
    }

    if (
        planet.isEmpty &&
        !state.research.researchedTechs.includes("expedition_kits")
    ) {
        get().addLog( i18nStore.t("game_logs.startExpedition_4"),
            "error",
        );
        return;
    }

    if (planet.expeditionCompleted) {
        get().addLog( i18nStore.t("game_logs.startExpedition_5"), "error");
        return;
    }

    // Filter out fatigued crew
    const validCrewIds = crewIds.filter((id) => {
        const member = state.crew.find((c) => c.id === id);
        return member && !member.expeditionFatigue;
    });

    if (validCrewIds.length === 0) {
        get().addLog( i18nStore.t("game_logs.startExpedition_6"), "error");
        return;
    }

    // Base AP = crew count
    let apTotal = validCrewIds.length;

    // Synthetic crew members each give +1 bonus AP (faster processing)
    const syntheticCount = validCrewIds.filter((id) => {
        const member = state.crew.find((c) => c.id === id);
        return member?.race === "synthetic";
    }).length;
    apTotal += syntheticCount;

    // Scouts grant +1 AP each: efficient surface navigation widens coverage
    const scoutCount = validCrewIds.filter((id) => {
        const member = state.crew.find((c) => c.id === id);
        return member?.profession === "scout";
    }).length;
    apTotal += scoutCount * 1;

    // Scientists grant surface scans: peek a reachable tile's type without AP
    const scientistCount = validCrewIds.filter((id) => {
        const member = state.crew.find((c) => c.id === id);
        return member?.profession === "scientist";
    }).length;
    const scansRemaining = scientistCount * EXPEDITION_SCANS_PER_SCIENTIST;
    const orbitalScanAvailable = state.ship.modules.some(
        (module) =>
            (module.type === "scanner" ||
                module.type === "deep_survey_array") &&
            isModuleActive(module),
    );

    // Technology bonus: expedition_kits gives +2 AP
    const techBonus = getTechBonusSum(state.research, "expedition_ap");
    apTotal += techBonus;

    const pointOfInterest =
        planet.isEmpty && planet.planetType
            ? planet.pointOfInterest ??
              PLANET_POINT_OF_INTERESTS[planet.planetType]
            : undefined;
    const environment = getExpeditionEnvironment(planet.planetType);
    const grid = generateExpeditionGrid(
        planet.dominantRace,
        pointOfInterest,
        planet.planetType,
    );

    const expedition: ExpeditionState = {
        planetId,
        grid,
        apTotal,
        apRemaining: apTotal,
        stepApCost: environment?.apCost ?? 1,
        revealedCount: 0,
        scansRemaining,
        orbitalScanAvailable,
        activeRuinsEvent: null,
        ruinsOutcome: null,
        ruinsDepth: 0,
        pendingTileIndex: null,
        rewards: {
            credits: 0,
            tradeGoods: [],
            researchResources: [],
            artifactFound: null,
        },
        finished: false,
        crewIds: validCrewIds,
    };

    const bonusInfo: string[] = [];
    if (syntheticCount > 0)
        bonusInfo.push(i18nStore.t("game_logs.expedition_bonus_synthetics", { count: syntheticCount }));
    if (scoutCount > 0)
        bonusInfo.push(i18nStore.t("game_logs.expedition_bonus_scouts", { count: scoutCount }));
    if (techBonus > 0)
        bonusInfo.push(i18nStore.t("game_logs.expedition_bonus_kits", { count: techBonus }));
    const bonusStr = bonusInfo.length > 0 ? ` [${bonusInfo.join(", ")}]` : "";

    set(() => ({ activeExpedition: expedition }));
    get().addLog(
        i18nStore.t("game_logs.expedition_started", {
            apTotal,
            bonusStr,
            scans:
                scansRemaining > 0
                    ? i18nStore.t("game_logs.expedition_scans", { scansRemaining })
                    : "",
        }),
        "info",
    );
}
