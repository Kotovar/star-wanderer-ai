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
        get().addLog("Выберите хотя бы одного члена экипажа для экспедиции.", "error");
        return;
    }

    const state = get();
    const planet = state.currentSector?.locations.find((l) => l.id === planetId);
    if (!planet) {
        get().addLog("Планета не найдена.", "error");
        return;
    }

    if (planet.isEmpty && !planet.explored) {
        get().addLog("Сначала завершите разведку поверхности.", "error");
        return;
    }

    if (
        planet.isEmpty &&
        !state.research.researchedTechs.includes("expedition_kits")
    ) {
        get().addLog(
            "Для экспедиции на пустую планету нужна технология «Комплекты экспедиции».",
            "error",
        );
        return;
    }

    if (planet.expeditionCompleted) {
        get().addLog("Эта планета уже была исследована.", "error");
        return;
    }

    // Filter out fatigued crew
    const validCrewIds = crewIds.filter((id) => {
        const member = state.crew.find((c) => c.id === id);
        return member && !member.expeditionFatigue;
    });

    if (validCrewIds.length === 0) {
        get().addLog("Все выбранные члены экипажа устали. Выберите других.", "error");
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
    if (syntheticCount > 0) bonusInfo.push(`+${syntheticCount} (синтетики)`);
    if (scoutCount > 0) bonusInfo.push(`+${scoutCount} (разведчики)`);
    if (techBonus > 0) bonusInfo.push(`+${techBonus} (комплекты)`);
    const bonusStr = bonusInfo.length > 0 ? ` [${bonusInfo.join(", ")}]` : "";

    set(() => ({ activeExpedition: expedition }));
    get().addLog(
        `🗺️ Экспедиция начата. AP: ${apTotal}${bonusStr}${
            scansRemaining > 0 ? `, сканов: ${scansRemaining}` : ""
        }`,
        "info",
    );
}
