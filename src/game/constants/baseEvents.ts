import type { OutpostResource } from "@/game/types/outposts";
import type { PlanetType } from "@/game/types/planets";

/**
 * Что случается на базе между визитами.
 *
 * Без этого петля выглядит как «прилетел, забрал, улетел»: всё, что база
 * делает, известно заранее, и возвращаться незачем, кроме как за бункером.
 * События редкие и мелкие — они добавляют повод, а не второй источник дохода.
 */
export interface BaseEvent {
    id: string;
    /** Вес при выборе события */
    weight: number;
    /** Нужен модуль этой услуги, иначе событие не выпадет */
    requiresService?: string;
    /**
     * Событие только для этих миров. Без списка выпадает где угодно.
     *
     * Общий список из пяти новостей звучал одинаково хоть на вулкане, хоть в
     * лесу: база стояла «где-то», а не на конкретной планете.
     */
    planetTypes?: readonly PlanetType[];
    /** Подарок в бункер */
    bunker?: Partial<Record<OutpostResource, number>>;
    /** Изменение морали приписанных */
    morale?: number;
    /** Кредиты */
    credits?: number;
}

export const BASE_EVENTS: BaseEvent[] = [
    {
        // Гарнизон нашёл что-то в породе — самое частое и самое скромное
        id: "vein_found",
        weight: 30,
        bunker: { rare_minerals: 3 },
    },
    {
        id: "salvage_run",
        weight: 25,
        bunker: { tech_salvage: 4 },
    },
    {
        // Лаборатория даёт повод для собственного события
        id: "lab_breakthrough",
        weight: 20,
        requiresService: undefined,
        bunker: { ancient_data: 3 },
    },
    {
        // Заезжий торговец: единственное событие с кредитами
        id: "passing_trader",
        weight: 15,
        credits: 600,
    },
    {
        // Гарнизон заскучал — напоминание, что там живые люди
        id: "long_shift",
        weight: 10,
        morale: -6,
    },
    // ── Местные новости: вес выше общих, но выпадают только на своих мирах ──
    {
        // Прорвался гейзер: на вулканическом мире беда и находка — одно и то же
        id: "geyser_breach",
        weight: 40,
        planetTypes: ["Вулканическая", "Приливная"],
        bunker: { energy_samples: 4 },
        morale: -3,
    },
    {
        id: "isotope_flare",
        weight: 40,
        planetTypes: ["Радиоактивная"],
        bunker: { energy_samples: 6 },
        morale: -4,
    },
    {
        // На месте старой войны копать интереснее, чем в породе
        id: "war_cache",
        weight: 40,
        planetTypes: ["Разрушенная войной"],
        bunker: { tech_salvage: 5, ancient_data: 2 },
    },
    {
        id: "ice_core",
        weight: 40,
        planetTypes: ["Ледяная", "Арктическая"],
        bunker: { water: 6 },
    },
    {
        id: "crystal_bloom",
        weight: 40,
        planetTypes: ["Кристаллическая", "Планета-кольцо"],
        bunker: { quantum_crystals: 1 },
    },
    {
        id: "fauna_sample",
        weight: 40,
        planetTypes: ["Лесная", "Тропическая", "Океаническая"],
        bunker: { alien_biology: 3 },
    },
];

/** Шанс события за ход на постройку */
export const BASE_EVENT_CHANCE = 0.02;
