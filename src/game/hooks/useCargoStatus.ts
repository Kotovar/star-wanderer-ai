import { useGameStore } from "@/game/store";

/**
 * Текущая загрузка трюма (карго + торговые товары + зонды) и флаг «трюм полон».
 * Общая проверка для панелей локаций, где сбор ресурсов ограничен вместимостью.
 */
export function useCargoStatus() {
    const ship = useGameStore((s) => s.ship);
    const probes = useGameStore((s) => s.probes);
    const getCargoCapacity = useGameStore((s) => s.getCargoCapacity);

    const currentCargo =
        ship.cargo.reduce((sum, c) => sum + c.quantity, 0) +
        ship.tradeGoods.reduce((sum, g) => sum + g.quantity, 0) +
        probes;
    const cargoFull = currentCargo >= getCargoCapacity();

    return { currentCargo, cargoFull };
}
