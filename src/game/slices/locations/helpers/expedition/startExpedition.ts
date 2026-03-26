import type { SetState, GameStore } from "@/game/types";
import type { ExpeditionState } from "@/game/types/exploration";
import { getTechBonusSum } from "@/game/research";
import { generateExpeditionGrid } from "./generateExpeditionGrid";

/**
 * Начинает экспедицию на поверхность населённой планеты.
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
    if (!planet || planet.isEmpty) {
        get().addLog("Экспедиция возможна только на населённых планетах.", "error");
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

    // Technology bonus: expedition_kits gives +2 AP
    const techBonus = getTechBonusSum(state.research, "expedition_ap");
    apTotal += techBonus;

    const grid = generateExpeditionGrid(planet.dominantRace);

    const expedition: ExpeditionState = {
        planetId,
        grid,
        apTotal,
        apRemaining: apTotal,
        revealedCount: 0,
        activeRuinsEvent: null,
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
    if (techBonus > 0) bonusInfo.push(`+${techBonus} (комплекты)`);
    const bonusStr = bonusInfo.length > 0 ? ` [${bonusInfo.join(", ")}]` : "";

    set(() => ({ activeExpedition: expedition }));
    get().addLog(`🗺️ Экспедиция начата. AP: ${apTotal}${bonusStr}`, "info");
}
