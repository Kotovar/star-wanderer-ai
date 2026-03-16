import { generateGalaxy } from "@/game/galaxy";
import { initializeStationData } from "@/game/stations";
import { initialState } from "@/game/initial";
import { clearLocalStorage, saveToLocalStorage } from "@/game/saves/utils";
import { playSound } from "@/sounds";
import type { GameStore, SetState } from "@/game/types";

/**
 * Индекс начального сектора в галактике
 */
const STARTING_SECTOR_INDEX = 0;

/**
 * Выполняет перезапуск игры с генерацией новой галактики
 * @param set - Функция обновления состояния
 * @param get - Функция получения текущего состояния
 */
export const restartGame = (set: SetState, get: () => GameStore): void => {
    clearLocalStorage();

    // Генерация новой галактики и данных станции
    const newSectors = generateGalaxy();

    // Помечаем стартовый сектор как посещённый
    newSectors[STARTING_SECTOR_INDEX].visited = true;

    const { prices: restartPrices, stock: restartStock } =
        initializeStationData(newSectors);

    set({
        ...initialState,
        currentSector: newSectors[STARTING_SECTOR_INDEX],
        galaxy: { sectors: newSectors },
        stationPrices: restartPrices,
        stationStock: restartStock,
        log: [],
    });

    get().addLog("Новая игра", "info");
    playSound("success");

    // Автосохранение после перезапуска (без логирования) для загрузки при обновлении
    saveToLocalStorage(get());
};
