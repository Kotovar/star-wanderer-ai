import { RACES } from "@/game/constants/races";
import type { CrewMember } from "@/game/types";

/**
 * Меняет настроение с учётом расы: расы без эмоций (hasHappiness=false)
 * не подвержены изменениям морали. Значение зажимается в [0, maxHappiness].
 * Отшельник («Одиночка») не теряет настроение, но набирать его может.
 *
 * Живёт отдельно от `crew/utils.ts`: там импортируется весь стор, и чистые
 * расчёты вроде жалованья не смогли бы переиспользовать эту функцию.
 */
export const shiftHappiness = (
    crewMember: CrewMember,
    delta: number,
): CrewMember => {
    if (RACES[crewMember.race]?.hasHappiness === false) return crewMember;
    if (crewMember.hermit && delta < 0) return crewMember;
    return {
        ...crewMember,
        happiness: Math.max(
            0,
            Math.min(
                crewMember.maxHappiness ?? 100,
                crewMember.happiness + delta,
            ),
        ),
    };
};

/** Настроения нет — есть износ: синтетики и прочие нечувствительные расы */
export const isHardwareCrew = (member: CrewMember): boolean =>
    RACES[member.race]?.hasHappiness === false;
