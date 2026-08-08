import type { OutpostResource } from "@/game/types/outposts";

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
];

/** Шанс события за ход на постройку */
export const BASE_EVENT_CHANCE = 0.02;
