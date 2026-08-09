import {
    RACE_CREW_NAMES,
    type CrewNameDefinition,
} from "@/game/constants/races";
import type { CrewMember, RaceId } from "@/game/types";
import { store as i18nStore } from "@/lib/useTranslation";

type CrewNameRef = Pick<CrewMember, "name" | "race"> &
    Partial<Pick<CrewMember, "nameId">>;

const NAMED_CREW_NAMES: Array<CrewNameDefinition & { race: RaceId }> = [
    { id: "human.arcturius_zorin", race: "human", legacy: "Арктурий Зорин" },
    { id: "human.eliara_ventris", race: "human", legacy: "Элиара Вентрис" },
    { id: "human.karo_medina", race: "human", legacy: "Каро Медина" },
    { id: "human.louise_dupont", race: "human", legacy: "Луиза Дюпон" },
    { id: "human.anton_lefevre", race: "human", legacy: "Антон Лефевр" },
    { id: "human.viktor_morozov", race: "human", legacy: "Виктор Морозов" },
    { id: "human.doctor_aigerim", race: "human", legacy: "Доктор Айгерим" },
    { id: "human.ivan_smirnov", race: "human", legacy: "Иван Смирнов" },
    { id: "human.ace_pilot", race: "human", legacy: "Ас-пилот" },
    { id: "human.systems_engineer", race: "human", legacy: "Инженер-наладчик" },
    { id: "human.field_medic", race: "human", legacy: "Медик-практик" },
    { id: "human.pathfinder", race: "human", legacy: "Следопыт" },
    { id: "human.theorist", race: "human", legacy: "Теоретик" },
    { id: "human.gunner", race: "human", legacy: "Канонир" },
    { id: "human.test_pilot", race: "human", legacy: "Тестовый пилот" },
    { id: "synthetic.alpha_7", race: "synthetic", legacy: "АЛЬФА-7" },
    { id: "synthetic.sigma_1", race: "synthetic", legacy: "СИГМА-1" },
    { id: "synthetic.vector_2", race: "synthetic", legacy: "ВЕКТОР-2" },
    { id: "krylorian.torkas_krass", race: "krylorian", legacy: "Торкас Кр'асс" },
    { id: "krylorian.varga_zork", race: "krylorian", legacy: "Варга З'орк" },
];

const normalizeCrewName = (name: string): string =>
    name.trim().toLocaleLowerCase("ru-RU");

export const findCrewNameId = (
    race: RaceId,
    legacyName: string,
): string | undefined => {
    const normalized = normalizeCrewName(legacyName);
    return (
        RACE_CREW_NAMES[race].find(
            (definition) =>
                normalizeCrewName(definition.legacy) === normalized,
        )?.id ??
        NAMED_CREW_NAMES.find(
            (definition) =>
                definition.race === race &&
                normalizeCrewName(definition.legacy) === normalized,
        )?.id
    );
};

export const getCrewDisplayName = (member: CrewNameRef): string => {
    const nameId = member.nameId ?? findCrewNameId(member.race, member.name);
    if (!nameId) return member.name;

    const key = `crew_names.${nameId}`;
    const translated = i18nStore.t(key);
    return translated === key ? member.name : translated;
};
