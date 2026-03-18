import type { SetState, GameStore, WeaponType } from "@/game/types";
import { playSound } from "@/sounds";

/** Scrap value (50% of original price) per weapon type */
export const WEAPON_SCRAP_VALUES: Record<WeaponType, number> = {
    kinetic: 100,
    laser: 150,
    missile: 200,
    plasma: 300,
    drones: 250,
    antimatter: 600,
    quantum_torpedo: 800,
};

/**
 * Removes a weapon from a weapon bay slot and returns 50% of its value as credits.
 *
 * @param moduleId - ID of the weaponbay module
 * @param weaponIndex - Index of the weapon slot within the bay
 */
export const removeWeapon = (
    moduleId: number,
    weaponIndex: number,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const mod = state.ship.modules.find((m) => m.id === moduleId);

    if (!mod || mod.type !== "weaponbay") {
        get().addLog("Модуль не найден или не является боевой палубой.", "info");
        return;
    }

    const weapon = mod.weapons?.[weaponIndex];
    if (!weapon) {
        get().addLog("Оружие в этом слоте не установлено.", "info");
        return;
    }

    const weaponType = weapon.type;
    const scrapValue = WEAPON_SCRAP_VALUES[weaponType] ?? 0;

    set((s) => {
        const newModules = s.ship.modules.map((m) => {
            if (m.id !== moduleId || !m.weapons) return m;
            const newWeapons = [...m.weapons];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            newWeapons[weaponIndex] = null as any;
            return { ...m, weapons: newWeapons };
        });
        return {
            ship: { ...s.ship, modules: newModules },
            credits: s.credits + scrapValue,
        };
    });

    get().addLog(
        `🔧 Снято: ${weaponType} (+${scrapValue}₢)`,
        "info",
    );
    playSound("shop");
};
