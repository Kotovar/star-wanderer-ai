/** Maximum reputation that can be purchased via diplomacy */
export const MAX_DIPLOMATIC_REP = 40;

/** Постоянная скидка на стоимость дипломатии после найма переводчика для расы */
export const TRANSLATOR_DIPLOMACY_DISCOUNT = 0.75;

/** Разовая стоимость найма переводчика для одной расы */
export const TRANSLATOR_HIRE_COST = 1000;

/**
 * Cost in credits to increase reputation by `amount` points starting at `currentRep`.
 *
 * Pricing model:
 * - Below 0: cost per point = 200 + |rep| * 10 (very expensive at -100, decreases toward 0)
 * - 0 to 40:  cost per point = 200 + rep * 20  (increases as rep improves)
 * - Above 40: cannot purchase
 *
 * `hasTranslator` applies TRANSLATOR_DIPLOMACY_DISCOUNT — a hired translator
 * (see diplomaticTranslatorRaceIds in GameState) permanently discounts this race.
 */
export function getDiplomacyCost(
    currentRep: number,
    amount: number,
    hasTranslator = false,
): number {
    let total = 0;
    for (let i = 0; i < amount; i++) {
        const rep = currentRep + i;
        if (rep >= MAX_DIPLOMATIC_REP) break;
        const costPerPoint =
            rep < 0
                ? 200 + Math.abs(rep) * 10
                : 200 + rep * 20;
        total += costPerPoint;
    }
    return hasTranslator
        ? Math.floor(total * TRANSLATOR_DIPLOMACY_DISCOUNT)
        : total;
}

/** Cost for a single +5 rep block */
export const DIPLOMACY_BLOCK_SIZE = 5;
