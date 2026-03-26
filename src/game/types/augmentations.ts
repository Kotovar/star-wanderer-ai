import type { Profession } from "./crew";
import type { RaceId } from "./races";

/**
 * Profession augmentation IDs
 */
export type ProfessionAugmentationId =
    | "neural_reflex"       // Pilot
    | "nano_hands"          // Engineer
    | "accelerated_regen"   // Medic
    | "optical_implant"     // Scout
    | "memory_core"         // Scientist
    | "targeting_eye";      // Gunner

/**
 * Racial augmentation IDs
 */
export type RacialAugmentationId =
    | "overclock_core"      // Synthetic
    | "symbiotic_armor"     // Xenosymbiont
    | "phase_step"          // Voidborn
    | "prismatic_lens";     // Crystalline

export type AugmentationId = ProfessionAugmentationId | RacialAugmentationId;

export interface AugmentationEffect {
    /** Bonus to evasion (pilot, %) */
    evasionBonus?: number;
    /** Bonus to repair efficiency (engineer, %) */
    repairBonus?: number;
    /** Bonus to healing output (medic, %) */
    healingBonus?: number;
    /** Extra scout attempts per turn */
    extraScoutAttempts?: number;
    /** Bonus to research speed (scientist, %) */
    researchSpeedBonus?: number;
    /** Bonus to weapon accuracy (gunner, %) */
    accuracyBonus?: number;
    /** Bonus to crit chance (gunner, %) */
    critBonus?: number;
    /** Bonus to all action speed (synthetic, %) */
    actionSpeedBonus?: number;
    /** Chance of AI glitch per turn (synthetic, %) */
    aiGlitchChance?: number;
    /** % of damage dealt converted to crew HP (xenosymbiont) */
    damageToHp?: number;
    /** Chance of full dodge (voidborn, %) */
    fullDodgeChance?: number;
    /** Bonus to laser weapon damage (crystalline, %) */
    laserDamageBonus?: number;
}

export interface Augmentation {
    id: AugmentationId;
    name: string;
    description: string;
    icon: string;
    /** Null = any profession/race; set to restrict availability */
    forProfession?: Profession;
    forRace?: RaceId;
    effect: AugmentationEffect;
    /** Credit cost at medical station */
    installCost: number;
}
