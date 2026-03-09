import i18n from './i18n';

// Helper function to get translated profession name
export function getProfessionName(profession: string): string {
    const translations: Record<string, string> = {
        pilot: i18n.t('professions.pilot'),
        engineer: i18n.t('professions.engineer'),
        medic: i18n.t('professions.medic'),
        scout: i18n.t('professions.scout'),
        scientist: i18n.t('professions.scientist'),
        gunner: i18n.t('professions.gunner'),
    };
    return translations[profession] || profession;
}

// Helper function to get translated profession description
export function getProfessionDescription(profession: string): string {
    const translations: Record<string, string> = {
        pilot: i18n.t('profession_descriptions.pilot'),
        engineer: i18n.t('profession_descriptions.engineer'),
        medic: i18n.t('profession_descriptions.medic'),
        scout: i18n.t('profession_descriptions.scout'),
        scientist: i18n.t('profession_descriptions.scientist'),
        gunner: i18n.t('profession_descriptions.gunner'),
    };
    return translations[profession] || '';
}

// Helper function to get translated race name
export function getRaceName(raceId: string): string {
    const translations: Record<string, string> = {
        human: i18n.t('races.human.name'),
        synthetic: i18n.t('races.synthetic.name'),
        xenosymbiont: i18n.t('races.xenosymbiont.name'),
        krylorian: i18n.t('races.krylorian.name'),
        voidborn: i18n.t('races.voidborn.name'),
        crystalline: i18n.t('races.crystalline.name'),
    };
    return translations[raceId] || raceId;
}

// Helper function to get translated race description
export function getRaceDescription(raceId: string): string {
    const translations: Record<string, string> = {
        human: i18n.t('races.human.description'),
        synthetic: i18n.t('races.synthetic.description'),
        xenosymbiont: i18n.t('races.xenosymbiont.description'),
        krylorian: i18n.t('races.krylorian.description'),
        voidborn: i18n.t('races.voidborn.description'),
        crystalline: i18n.t('races.crystalline.description'),
    };
    return translations[raceId] || '';
}

// Helper function to get translated combat action
export function getCombatActionLabel(profession: string, action: string): string {
    const translations: Record<string, Record<string, string>> = {
        pilot: {
            '': i18n.t('combat_actions.waiting'),
            evasion: i18n.t('combat_actions.evasion'),
        },
        engineer: {
            '': i18n.t('combat_actions.waiting'),
            repair: i18n.t('combat_actions.repair'),
            calibration: i18n.t('combat_actions.calibration'),
            overclock: i18n.t('combat_actions.overclock'),
        },
        medic: {
            '': i18n.t('combat_actions.waiting'),
            heal: i18n.t('combat_actions.heal'),
            firstaid: i18n.t('combat_actions.firstaid'),
        },
        scout: {
            '': i18n.t('combat_actions.waiting'),
            sabotage: i18n.t('combat_actions.sabotage'),
        },
        scientist: {
            '': i18n.t('combat_actions.waiting'),
            analysis: i18n.t('combat_actions.analysis'),
        },
        gunner: {
            '': i18n.t('combat_actions.waiting'),
            targeting: i18n.t('combat_actions.targeting'),
            rapidfire: i18n.t('combat_actions.rapidfire'),
        },
    };
    return translations[profession]?.[action] || action;
}

// Helper function to get translated crew action
export function getCrewActionLabel(profession: string, action: string): string {
    const translations: Record<string, Record<string, string>> = {
        pilot: {
            '': i18n.t('crew_actions.waiting'),
            navigation: i18n.t('crew_actions.navigation'),
        },
        engineer: {
            '': i18n.t('crew_actions.waiting'),
            repair: i18n.t('crew_actions.repair'),
            reactor_overload: i18n.t('crew_actions.reactor_overload'),
        },
        medic: {
            '': i18n.t('crew_actions.waiting'),
            heal: i18n.t('crew_actions.heal'),
            morale: i18n.t('crew_actions.morale'),
            firstaid: i18n.t('crew_actions.firstaid'),
        },
        scout: {
            '': i18n.t('crew_actions.waiting'),
            patrol: i18n.t('crew_actions.patrol'),
        },
        scientist: {
            '': i18n.t('crew_actions.waiting'),
            research: i18n.t('crew_actions.research'),
            analyzing: i18n.t('crew_actions.analyzing'),
        },
        gunner: {
            '': i18n.t('crew_actions.waiting'),
            maintenance: i18n.t('crew_actions.maintenance'),
        },
    };
    return translations[profession]?.[action] || action;
}
