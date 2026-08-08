import { BASE_MODULES, BASE_SERVICE_VALUES } from "@/game/constants/baseModules";
import type { BaseService } from "@/game/constants/baseModules";
import type { Outpost } from "@/game/types/outposts";

/**
 * Есть ли на базе работающий служебный модуль.
 *
 * Чистая функция от постройки: её спрашивают и сканер, и панель базы, и
 * гарнизон. Иначе «есть ли у меня ретранслятор» пришлось бы считать
 * по-своему в каждом месте.
 */
export function hasBaseService(
    outpost: Outpost | undefined,
    service: BaseService,
): boolean {
    return Boolean(
        outpost?.modules?.some((id) => BASE_MODULES[id].service === service),
    );
}

/** Первая база игрока со всеми модулями — её ищут почти все потребители */
export const findBase = (outposts: readonly Outpost[]): Outpost | undefined =>
    outposts.find((outpost) => outpost.kind === "base");

/**
 * Прибавка к дальности сканирования от ретранслятора.
 *
 * Работает откуда угодно: смысл ретранслятора именно в том, что он
 * расширяет вашу картину галактики, пока вы летаете где-то ещё.
 */
export function getRelayScanBonus(outposts: readonly Outpost[]): number {
    return hasBaseService(findBase(outposts), "relay")
        ? BASE_SERVICE_VALUES.relayScanRange
        : 0;
}

/** Дополнительные места гарнизона от казармы */
export function getBarracksSlots(outpost: Outpost): number {
    return hasBaseService(outpost, "garrison")
        ? BASE_SERVICE_VALUES.garrisonSlots
        : 0;
}
