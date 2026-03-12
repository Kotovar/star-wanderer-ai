import type { GameState, GameStore, GameMode } from "@/game/types";
import { playSound } from "@/sounds";
import { isModuleActive } from "@/lib";

/**
 * Обработка выбора сектора для путешествия
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param sectorId - ID выбранного сектора
 */
export const selectSector = (
    set: (fn: (state: GameState) => void) => void,
    get: () => GameStore,
    sectorId: number,
): void => {
    const state = get();
    const cockpit = state.ship.modules.find(
        (m) => m.type === "cockpit" && !m.disabled,
    );
    if (!cockpit) {
        get().addLog(
            "Кабина отключена! Невозможно управлять кораблем!",
            "error",
        );
        playSound("error");
        return;
    }
    if (state.traveling) return;

    const sector = state.galaxy.sectors.find((s) => s.id === sectorId);
    if (!sector) return;

    // Если уже в этом секторе - просто открываем карту сектора
    if (sectorId === state.currentSector?.id) {
        set((s) => ({ ...s, gameMode: "sector_map" as GameMode }));
        return;
    }

    // Проверка работоспособности двигателей и топливных баков
    const enginesWorking = get().areEnginesFunctional();
    const tanksWorking = get().areFuelTanksFunctional();

    // Если двигатели или баки не работают - межсистемные полёты запрещены
    if (!enginesWorking || !tanksWorking) {
        const reason = !enginesWorking ? "Двигатели" : "Топливные баки";
        get().addLog(
            `${reason} не работают! Межсистемные полёты запрещены`,
            "error",
        );
        playSound("error");
        return;
    }

    // Check tier access requirements (only when traveling to new sector)
    const engines = state.ship.modules.filter(
        (m) => m.type === "engine" && isModuleActive(m),
    );
    const engineLevel =
        engines.length > 0 ? Math.max(...engines.map((e) => e.level || 1)) : 1;
    const captainLevel =
        state.crew.find((c) => c.profession === "pilot")?.level ?? 1;

    if (sector.tier === 2 && (engineLevel < 2 || captainLevel < 2)) {
        get().addLog(
            `Доступ к Тир 2 требует: Двигатель Ур.2 + Капитан Ур.2`,
            "error",
        );
        playSound("error");
        return;
    }

    if (sector.tier === 3 && (engineLevel < 3 || captainLevel < 3)) {
        get().addLog(
            `Доступ к Тир 3 требует: Двигатель Ур.3 + Капитан Ур.3`,
            "error",
        );
        playSound("error");
        return;
    }

    // Check tier 4 access - VICTORY CONDITION
    if (sector.tier === 4) {
        const hasTier4Engine = state.ship.modules.some(
            (m) =>
                m.type === "engine" &&
                !m.disabled &&
                m.health > 0 &&
                (m.level || 1) >= 4,
        );
        if (engineLevel < 4 || captainLevel < 4 || !hasTier4Engine) {
            get().addLog(
                `Доступ к Тир 4 требует: Двигатель Ур.4 + Капитан Ур.4`,
                "error",
            );
            playSound("error");
            return;
        }
        // VICTORY! Player reached the edge of the galaxy
        get().triggerVictory();
        return;
    }

    // Check if pilot is in cockpit for bonuses
    const pilot = state.crew.find((c) => c.profession === "pilot");
    const pilotInCockpit = pilot && pilot.moduleId === cockpit.id;

    // Check for void_engine artifact (free fuel for inter-sector travel)
    // Both regular void_engine and cursed void_drive artifacts
    const voidEngine = state.artifacts.find(
        (a) =>
            (a.effect.type === "fuel_free" ||
                a.effect.type === "void_engine") &&
            a.effect.active,
    );

    // Check for warp_coil artifact (instant inter-sector travel)
    const warpCoil = state.artifacts.find(
        (a) => a.effect.type === "sector_teleport" && a.effect.active,
    );

    // Calculate fuel cost with penalty if pilot not in cockpit
    let fuelCost = get().calculateFuelCost(sector.id);
    let travelInstant = false;

    // Apply void_engine artifact bonus (free inter-sector travel)
    if (voidEngine) {
        fuelCost = 0;
        const artifactName = voidEngine.cursed
            ? "Варп Бездны"
            : "Вакуумный двигатель";
        get().addLog(
            `⚡ ${artifactName}! Бесплатный межсекторный перелёт!`,
            "info",
        );

        // Apply crew health drain for cursed void_engine (Void Drive)
        if (
            voidEngine.cursed &&
            voidEngine.negativeEffect?.type === "health_drain"
        ) {
            const negativeValue = voidEngine.negativeEffect?.value || 5;
            set((s) => ({
                crew: s.crew.map((c) => ({
                    ...c,
                    health: Math.max(1, c.health - negativeValue),
                })),
            }));
            get().addLog(
                `⚠️ ${artifactName}: Экипаж пострадал на -${negativeValue} здоровья`,
                "warning",
            );
        }
    }

    // Apply warp_coil artifact bonus (instant inter-sector travel - no turn)
    if (warpCoil) {
        travelInstant = true;
        get().addLog(
            `⚡ Варп-Катушка! Мгновенный межсекторный перелёт!`,
            "info",
        );
    } else if (!pilotInCockpit) {
        fuelCost = Math.floor(fuelCost * 1.5); // 50% more fuel
        get().addLog(`⚠ Пилот не в кабине! Расход топлива +50%`, "warning");
    }

    if (state.ship.fuel < fuelCost) {
        get().addLog(
            `Недостаточно топлива! Нужно: ${fuelCost}, есть: ${state.ship.fuel}`,
            "error",
        );
        playSound("error");
        return;
    }

    // Consume fuel
    set((s) => ({
        ship: {
            ...s.ship,
            fuel: Math.max(0, (s.ship.fuel || 0) - fuelCost),
        },
    }));
    if (fuelCost > 0) {
        get().addLog(`Расход топлива: -${fuelCost}`, "info");
    } else {
        get().addLog(`Расход топлива: Бесплатно`, "info");
    }

    // Risk of module damage if pilot not in cockpit during inter-tier travel
    const distance = Math.abs(sector.tier - (state.currentSector?.tier ?? 1));

    if (!pilotInCockpit && distance > 0) {
        // 30% chance per tier distance of module damage
        const damageChance = 0.3 * distance;
        if (Math.random() < damageChance) {
            const activeModules = state.ship.modules.filter(
                (m) => m.health > 10,
            );
            if (activeModules.length > 0) {
                const damagedModule =
                    activeModules[
                        Math.floor(Math.random() * activeModules.length)
                    ];
                const damage = 10 + Math.floor(Math.random() * 15);
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === damagedModule.id
                                ? {
                                      ...m,
                                      health: Math.max(10, m.health - damage),
                                  }
                                : m,
                        ),
                    },
                }));
                get().addLog(
                    `⚠ Навигационная ошибка! "${damagedModule.name}" повреждён: -${damage}%`,
                    "error",
                );
            }
        }
    }

    playSound("travel");

    if (distance === 0) {
        if (pilot) get().gainExp(pilot, 5);
        // Mark sector as visited
        set((s) => ({
            currentSector: { ...sector, visited: true },
            galaxy: {
                ...s.galaxy,
                sectors: s.galaxy.sectors.map((sec) =>
                    sec.id === sector.id ? { ...sec, visited: true } : sec,
                ),
            },
        }));
        get().addLog(`Перелёт в ${sector.name}`, "info");
        if (!travelInstant) {
            get().nextTurn();
        }
        set((s) => ({ ...s, gameMode: "sector_map" as GameMode }));
    } else {
        if (pilot) get().gainExp(pilot, distance * 15);
        // Mark sector as visited
        set((s) => ({
            traveling: travelInstant
                ? null
                : {
                      destination: sector,
                      turnsLeft: distance,
                      turnsTotal: distance,
                  },
            gameMode: "galaxy_map" as GameMode,
            galaxy: {
                ...s.galaxy,
                sectors: s.galaxy.sectors.map((sec) =>
                    sec.id === sector.id ? { ...sec, visited: true } : sec,
                ),
            },
        }));
        if (travelInstant) {
            // Instant travel - arrive immediately
            set(() => ({
                currentSector: { ...sector, visited: true },
                gameMode: "sector_map" as GameMode,
            }));
            get().addLog(`⚡ Мгновенный перелёт в ${sector.name}!`, "info");
        } else {
            get().addLog(
                `Начато путешествие в ${sector.name} (${distance} ходов)`,
                "info",
            );
            // Не вызываем nextTurn() автоматически - игрок должен сам завершить ход
        }
    }
};
