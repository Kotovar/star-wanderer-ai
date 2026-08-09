import type { PlanetType } from "@/game/types/planets";
import type { BaseService } from "./baseModules";

/**
 * Чем планета берёт с базы плату за то, что база на ней стоит.
 *
 * Тип планеты решал только, что качает буровая, — то есть на выбор «что
 * поставить в слоты» не влиял вовсе. Здесь он влияет: у каждого семейства
 * миров своя постоянная беда, и отвечает на неё конкретный служебный модуль.
 * Слотов меньше, чем модулей, поэтому «медблок на радиоактивной» — это минус
 * одна буровая, и место постройки становится частью сборки, а не только
 * источником ресурсов.
 *
 * Черты планеты при этом остаются про разовое «здесь возможно / здесь вдвое»,
 * а тип — про то, с чем база живёт каждый ход. Две системы не должны говорить
 * об одном и том же.
 */
export type PlanetHazardId =
    | "radiation"
    | "tremors"
    | "known_coordinates"
    | "deep_cold";

export interface PlanetHazardDef {
    id: PlanetHazardId;
    types: readonly PlanetType[];
    /** Услуга, снимающая последствие. Без неё беда работает в полную силу */
    answeredBy?: BaseService;
    /** Множитель выработки, пока не отвечено */
    outputPenalty?: number;
    /** Урон здоровью приписанных раз в PLANET_HAZARD_INTERVAL ходов */
    crewDamage?: number;
    /** Множитель шанса захвата */
    raidMultiplier?: number;
    /** Насколько дольше идут любые работы. Отвечать нечем — это цена входа */
    extraWorkTurns?: number;
}

export const PLANET_HAZARDS: readonly PlanetHazardDef[] = [
    {
        // Единственная беда, которая бьёт по людям, а не по числам: держать
        // тут гарнизон без медблока нельзя, а без гарнизона база работает
        // на 0.7 — то есть слот съедается в любом случае
        id: "radiation",
        types: ["Радиоактивная"],
        answeredBy: "heal",
        crewDamage: 6,
    },
    {
        // Толчки сбивают выработку, а не ломают модули: прочности у модулей
        // базы нет, и заводить её ради одного типа планет — целая система
        id: "tremors",
        types: ["Вулканическая", "Приливная"],
        answeredBy: "repair",
        outputPenalty: 0.75,
    },
    {
        // Эти координаты знают не только вы: на месте старой войны база стоит
        // там, куда уже кто-то летал
        id: "known_coordinates",
        types: ["Разрушенная войной"],
        answeredBy: "defense",
        raidMultiplier: 1.6,
    },
    {
        // Отвечать нечем намеренно: у холодных миров и так лучший крекер,
        // а плата за них — время, а не слот
        id: "deep_cold",
        types: ["Ледяная", "Арктическая"],
        extraWorkTurns: 2,
    },
];

/** Раз в столько ходов беда планеты бьёт по гарнизону */
export const PLANET_HAZARD_INTERVAL = 5;

/** Чем опасен этот мир — или `undefined`, если ничем */
export const getPlanetHazard = (
    planetType?: PlanetType,
): PlanetHazardDef | undefined =>
    planetType
        ? PLANET_HAZARDS.find((hazard) => hazard.types.includes(planetType))
        : undefined;

/** Насколько дольше здесь идут работы */
export const getHazardWorkTurns = (planetType?: PlanetType): number =>
    getPlanetHazard(planetType)?.extraWorkTurns ?? 0;
