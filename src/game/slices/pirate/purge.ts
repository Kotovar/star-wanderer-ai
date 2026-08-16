import { store as i18nStore } from "@/lib/useTranslation";
import type {
    Contract,
    GameStore,
    Location,
    Sector,
    SetState,
} from "@/game/types";
import { patchLocation } from "@/game/utils/patchLocation";
import { clampWantedHeat } from "./wanted";
import { PIRATE_RANK_ASSOCIATE } from "./standing";

/**
 * Зачистка пиратской базы — вторая сторона развилки.
 *
 * До неё пиратство ничего не закрывало: контрабанду можно было возить с
 * идеальной репутацией у всех рас, потому что противопоставить ей было нечего.
 * Теперь стороны исключают друг друга: подряд на зачистку не дадут тому, кого
 * пираты считают своим, а взявший его не может работать на их доске. Успешный
 * штурм уносит базу насовсем — вместе с чёрным рынком, трофейным складом,
 * доской и «Приютом контрабандистов».
 */

/**
 * Порог, с которого расы уже не доверяют подряд на пиратов. Совпадает с рангом
 * «свой» не случайно: ровно с него пираты начинают давать льготы, и ровно с
 * него легальная сторона перестаёт считать тебя нейтральным.
 */
export const PIRATE_PURGE_STANDING_LIMIT = PIRATE_RANK_ASSOCIATE;

/** Репутация с расой заказчика за уничтоженную базу */
export const PIRATE_PURGE_REPUTATION = 12;

/** Розыск, который снимает доказанная лояльность */
export const PIRATE_PURGE_HEAT_RELIEF = 30;

const PURGE_BASE_REWARD = 900;
const PURGE_REWARD_PER_TIER = 400;

/** Угроза базы: она защищена лучше рядового патруля того же тира */
export const getPirateBaseThreat = (tier: number): number =>
    Math.min(4, Math.max(2, tier + 1));

export const isPirateBaseAlive = (location: Location): boolean =>
    Boolean(location.stationConfig?.isPirate) && !location.pirateBaseDestroyed;

/**
 * Игрок подрядился уничтожить базу — работать на её доске он больше не может.
 * Проверяется отдельным помощником, а не сравнением id: подряд закрывает
 * пиратов целиком, а не только ту станцию, что стоит в цели.
 */
export const hasActivePiratePurge = (contracts: readonly Contract[]): boolean =>
    contracts.some((contract) => contract.type === "pirate_purge");

/**
 * Вешает по одному подряду на каждую пиратскую базу — на обитаемую планету в
 * другом секторе. Отдельным проходом, а не через случайный пул планетных
 * контрактов: развилка должна существовать в каждом забеге, а не выпадать.
 */
export function populatePurgeContracts(sectors: Sector[]): void {
    const bases = sectors.flatMap((sector) =>
        sector.locations
            .filter((location) => location.stationConfig?.isPirate)
            .map((location) => ({ sector, location })),
    );

    bases.forEach(({ sector, location }) => {
        const issuers = sectors
            .filter((candidate) => candidate.id !== sector.id)
            .flatMap((candidate) =>
                candidate.locations
                    .filter(
                        (planet) =>
                            planet.type === "planet" &&
                            !planet.isEmpty &&
                            planet.dominantRace,
                    )
                    .map((planet) => ({ sector: candidate, planet })),
            );
        if (issuers.length === 0) return;

        const issuer = issuers[Math.floor(Math.random() * issuers.length)];
        const contract: Contract = {
            id: `purge-${location.id}`,
            type: "pirate_purge",
            desc: "contracts.desc_pirate_purge",
            reward: PURGE_BASE_REWARD + PURGE_REWARD_PER_TIER * sector.tier,
            reputationReward: PIRATE_PURGE_REPUTATION,
            sourcePlanetId: issuer.planet.id,
            sourcePlanetName: issuer.planet.name,
            sourceSector: issuer.sector.id,
            sourceSectorName: issuer.sector.name,
            sourceDominantRace: issuer.planet.dominantRace,
            targetLocationId: location.id,
            targetLocationName: location.name,
            targetSector: sector.id,
            targetSectorName: sector.name,
            targetThreat: getPirateBaseThreat(sector.tier),
        };
        issuer.planet.contracts = [...(issuer.planet.contracts ?? []), contract];
    });
}

/**
 * Штурм базы: обычный бой на месте, по образцу штурма захваченной постройки.
 * Метка в состоянии нужна потому, что победить можно разными путями, а
 * засчитать штурм надо ровно один раз и ровно там, где он начался.
 */
export function assaultPirateBase(set: SetState, get: () => GameStore): void {
    const state = get();
    const location = state.currentLocation;
    const contract = state.activeContracts.find(
        (active) =>
            active.type === "pirate_purge" &&
            active.targetLocationId === location?.id,
    );
    if (!location || !contract) {
        get().addLog(i18nStore.t("pirate.err_no_purge_contract"), "error");
        return;
    }

    const defenders: Location = {
        id: `${location.id}-defenders`,
        type: "enemy",
        // Имя уходит в бой и в панель результатов как есть — там ключи не
        // переводят, поэтому переводим здесь
        name: i18nStore.t("pirate.base_defenders"),
        enemyType: "pirate",
        threat: contract.targetThreat ?? 2,
    };

    set(() => ({ assaultingPirateBaseId: location.id }));
    get().addLog(i18nStore.t("pirate.purge_started"), "warning");
    get().startCombat(defenders, false);
}

/**
 * Итог штурма. Зовётся из общей обработки победы: пометка живёт до следующей
 * победы, и без проверки места чужой бой засчитывался бы за взятую базу.
 */
export function resolvePirateBaseAssault(
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const baseId = state.assaultingPirateBaseId;
    if (!baseId) return;

    if (state.currentLocation?.id !== baseId) {
        set(() => ({ assaultingPirateBaseId: null }));
        return;
    }

    const contract = state.activeContracts.find(
        (active) =>
            active.type === "pirate_purge" && active.targetLocationId === baseId,
    );

    set((s) => ({
        assaultingPirateBaseId: null,
        // База уходит насовсем вместе с доской: ни чёрного рынка, ни трофеев,
        // ни отмывки. Если она была единственной — пиратская ветка закрыта
        // до конца забега
        ...patchLocation(s, baseId, {
            pirateBaseDestroyed: true,
            pirateContracts: [],
        }),
        wantedHeat: clampWantedHeat(
            (s.wantedHeat ?? 0) - PIRATE_PURGE_HEAT_RELIEF,
        ),
        // Доверие пиратов не восстанавливают: базу сдали не по недоразумению
        pirateStanding: 0,
        activeContracts: contract
            ? s.activeContracts.filter((active) => active.id !== contract.id)
            : s.activeContracts,
        completedContractIds: contract
            ? [...s.completedContractIds, contract.id]
            : s.completedContractIds,
        credits: contract ? s.credits + contract.reward : s.credits,
    }));

    get().addLog(i18nStore.t("pirate.purge_done"), "info");

    if (contract?.sourceDominantRace) {
        get().changeReputation(
            contract.sourceDominantRace,
            contract.reputationReward ?? PIRATE_PURGE_REPUTATION,
        );
    }
}
