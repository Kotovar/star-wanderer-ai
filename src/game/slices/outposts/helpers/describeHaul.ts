import { RESEARCH_RESOURCES } from "@/game/constants/research/resources";
import type { OutpostResource } from "@/game/types/outposts";
import { getHaulKind } from "./routeHaul";

type Translate = (key: string) => string;

/** Человеческое имя единицы добычи — газ, товар и образец зовутся по-разному */
export function describeHaulResource(
    resource: OutpostResource,
    t: Translate,
): string {
    switch (getHaulKind(resource)) {
        case "gas":
            return t(`gases.${resource}.name`);
        case "good":
            return t(`trade.goods.${resource}`);
        case "research":
            return (
                RESEARCH_RESOURCES[
                    resource as keyof typeof RESEARCH_RESOURCES
                ]?.name ?? resource
            );
        default:
            return resource;
    }
}
