import type { Goods } from "@/game/types/goods";
import type { PlanetType } from "@/game/types/planets";
import type { ResearchResourceType } from "@/game/types/research";

/**
 * Что несёт в себе планета каждого типа.
 *
 * Таблица повторяет ту, по которой работает планетарный бур: копать
 * вулканический мир и кристаллический должно значить разное, и база обязана
 * следовать той же логике, иначе её буровая выдаёт одни и те же минералы
 * где угодно и тип планеты перестаёт что-либо значить.
 */
export interface PlanetResourceProfile {
    /** Основной товар в трюм. Не у всех типов он есть */
    good?: Goods;
    /** Основной научный образец */
    research: ResearchResourceType;
}

const PROFILES: Record<PlanetType, PlanetResourceProfile> = {
    Ледяная: { good: "water", research: "rare_minerals" },
    Арктическая: { good: "water", research: "rare_minerals" },
    Вулканическая: { good: "minerals", research: "energy_samples" },
    Приливная: { good: "minerals", research: "energy_samples" },
    Лесная: { good: "food", research: "alien_biology" },
    Тропическая: { good: "food", research: "alien_biology" },
    Океаническая: { good: "water", research: "alien_biology" },
    Кристаллическая: { good: "rare_minerals", research: "quantum_crystals" },
    Пустынная: { good: "minerals", research: "rare_minerals" },
    "Планета-кольцо": { good: "rare_minerals", research: "quantum_crystals" },
    // Радиоактивная и разрушенная войной товара не дают: там нечего возить,
    // зато научного материала больше обычного
    Радиоактивная: { research: "energy_samples" },
    "Разрушенная войной": { research: "ancient_data" },
};

const DEFAULT_PROFILE: PlanetResourceProfile = {
    good: "minerals",
    research: "tech_salvage",
};

export const getPlanetResourceProfile = (
    planetType?: PlanetType,
): PlanetResourceProfile =>
    (planetType && PROFILES[planetType]) ?? DEFAULT_PROFILE;
