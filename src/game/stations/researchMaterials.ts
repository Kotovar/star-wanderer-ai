import type { ResearchResourceType } from "@/game/types/research";

/** Обычные материалы, доступные только в ограниченном запасе на научной станции. */
export const RESEARCH_STATION_BUY_PRICES: Partial<
    Record<ResearchResourceType, number>
> = {
    tech_salvage: 100,
};

export const RESEARCH_STATION_MATERIAL_STOCK = 6;

export const getResearchMaterialPurchaseKey = (
    type: ResearchResourceType,
): string => `research-material:${type}`;

export const getResearchMaterialStock = (
    stationId: string,
    type: ResearchResourceType,
    stationInventory: Record<string, Record<string, number>>,
): number =>
    Math.max(
        0,
        RESEARCH_STATION_MATERIAL_STOCK -
            (stationInventory[stationId]?.[getResearchMaterialPurchaseKey(type)] ??
                0),
    );

export const getResearchMaterialStocks = (
    stationId: string,
    stationInventory: Record<string, Record<string, number>>,
): Partial<Record<ResearchResourceType, number>> =>
    Object.fromEntries(
        Object.keys(RESEARCH_STATION_BUY_PRICES).map((type) => [
            type,
            getResearchMaterialStock(
                stationId,
                type as ResearchResourceType,
                stationInventory,
            ),
        ]),
    );
