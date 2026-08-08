import type { CargoItem } from "@/game/types";

type Translate = (
    key: string,
    params?: Record<string, string | number>,
) => string;

/**
 * Человеческое имя предмета трюма.
 *
 * У груза три разных облика — задание, модуль и собранное орудие, — и каждый
 * зовётся по-своему. Общий помощник, чтобы склад и шлюз не расходились в
 * названиях одного и того же ящика.
 */
export function describeCargoItem(item: CargoItem, t: Translate): string {
    if (item.isCraftedWeapon && item.weaponType) {
        return t(`weapon_types.${item.weaponType}`);
    }
    if (item.isModule) return item.module?.name ?? item.item;
    return t(`cargo_items.${item.item}`, { defaultValue: item.item });
}
