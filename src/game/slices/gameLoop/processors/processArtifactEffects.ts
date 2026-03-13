import { getArtifactEffectValue } from "@/game/artifacts";
import type { GameState, GameStore, SetState } from "@/game/types";

/**
 * Обработка положительных эффектов артефактов
 *
 * Обрабатывает артефакты с постоянными эффектами каждый ход:
 * - free_power (Вечное Ядро) - бесплатная энергия
 * - nanite_repair (Нанитовая Обшивка) - авторемонт модулей
 * - auto_repair (Паразитические Наниты) - авторемонт модулей
 * - abyss_power (Реактор Бездны) - бонус к энергии
 * - shield_regen_boost (Регенератор Щитов) - бонус к регенерации щитов
 * - dark_shield (Тёмный Щит) - бонус к щитам
 *
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processArtifactEffects = (
    state: GameState,
    set: SetState,
    get: () => GameStore,
): void => {
    const activeArtifacts = state.artifacts.filter((a) => a.effect.active);

    activeArtifacts.forEach((artifact) => {
        const effectType = artifact.effect.type;
        const effectValue = artifact.effect.value ?? 0;

        switch (effectType) {
            // === ЭНЕРГИЯ ===
            case "free_power": {
                // Вечное Ядро - бесплатная энергия (обрабатывается в getTotalPower)
                const powerBonus = effectValue;
                get().addLog(
                    `⚡ Вечное Ядро: +${powerBonus}⚡ бесплатной энергии`,
                    "info",
                );
                break;
            }

            case "abyss_power": {
                // Реактор Бездны - бонус к энергии (обрабатывается в getTotalPower)
                const powerBonus = effectValue;
                get().addLog(`⚛️ Реактор Бездны: +${powerBonus}⚡`, "info");
                break;
            }

            // === АВТО-РЕМОНТ ===
            case "nanite_repair": {
                // Нанитовая Обшивка - ремонт модулей
                const repairAmount = effectValue;
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) => ({
                            ...m,
                            health: Math.min(100, m.health + repairAmount),
                        })),
                    },
                }));
                get().addLog(
                    `🔧 Нанитовая Обшивка: ремонт +${repairAmount}%`,
                    "info",
                );
                break;
            }

            case "auto_repair": {
                // Паразитические Наниты - ремонт модулей
                const repairAmount = getArtifactEffectValue(artifact, state);
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) => ({
                            ...m,
                            health: Math.min(100, m.health + repairAmount),
                        })),
                    },
                }));
                get().addLog(
                    `🔧 Паразитические Наниты: ремонт +${repairAmount}%`,
                    "info",
                );
                break;
            }

            // === ЩИТЫ ===
            case "dark_shield": {
                // Тёмный Щит - бонус к максимальным щитам (обрабатывается в updateShipStats)
                const shieldBonus = effectValue;
                get().addLog(`🛡️ Тёмный Щит: +${shieldBonus} к щитам`, "info");
                break;
            }

            case "shield_regen_boost": {
                // Регенератор Щитов - бонус к регенерации (обрабатывается в regenerateShields)
                const regenBoost = Math.round(effectValue * 100);
                get().addLog(
                    `⚡ Регенератор Щитов: +${regenBoost}% к регенерации`,
                    "info",
                );
                break;
            }

            // === ОРУЖИЕ И БОЙ ===
            case "damage_boost": {
                // Усиление урона (обрабатывается в getTotalDamage)
                const damageBoost = Math.round(effectValue * 100);
                get().addLog(`💥 Бонус к урону: +${damageBoost}%`, "info");
                break;
            }

            case "accuracy_boost": {
                // Бонус к точности (обрабатывается в attackEnemy)
                const accuracyBoost = Math.round(effectValue * 100);
                get().addLog(`🎯 Бонус к точности: +${accuracyBoost}%`, "info");
                break;
            }

            case "crit_chance": {
                // Шанс крита (обрабатывается в attackEnemy)
                const critChance = Math.round(effectValue * 100);
                get().addLog(`⚡ Шанс крита: ${critChance}%`, "info");
                break;
            }

            // === СКАНИРОВАНИЕ ===
            case "quantum_scan": {
                // Квантовый сканер (обрабатывается в getEffectiveScanRange)
                const scanBonus = effectValue;
                get().addLog(
                    `📡 Квантовый Сканер: +${scanBonus} к дальности`,
                    "info",
                );
                break;
            }

            case "all_seeing": {
                // Око Сингулярности - все враги видны (обрабатывается в selectLocation)
                get().addLog(`👁️ Око Сингулярности: все враги видны`, "info");
                break;
            }

            // === ПЕРЕДВИЖЕНИЕ ===
            case "void_engine": {
                // Вакуумный Двигатель - бесплатные перелёты (обрабатывается в selectSector)
                get().addLog(
                    `🌀 Вакуумный Двигатель: бесплатные перелёты`,
                    "info",
                );
                break;
            }

            case "fuel_free": {
                // Варп-Катушка - мгновенные перемещения (обрабатывается в selectSector)
                get().addLog(`⚡ Варп-Катушка: мгновенные перемещения`, "info");
                break;
            }

            // === ЭКИПАЖ ===
            case "crew_immortal": {
                // Кристалл Жизни - бессмертие (обрабатывается в checkOxygen/moduleDamage)
                get().addLog(`💖 Кристалл Жизни: экипаж бессмертен`, "info");
                break;
            }

            case "undying_crew": {
                // Биосфера Древних - бессмертие с мутациями
                get().addLog(`🧬 Биосфера Древних: экипаж не умирает`, "info");
                break;
            }

            case "ai_control": {
                // ИИ Нейросеть - управление без экипажа
                get().addLog(
                    `🤖 ИИ Нейросеть: корабль управляется автоматически`,
                    "info",
                );
                break;
            }

            // === НАХОДКИ ===
            case "artifact_finder": {
                // Компас Древних - шанс находок (обрабатывается в tryFindArtifact)
                const findBonus = effectValue;
                get().addLog(
                    `🧭 Компас Древних: x${findBonus} к находкам`,
                    "info",
                );
                break;
            }

            case "credit_booster": {
                // Чёрный Ящик - бонус к кредитам (обрабатывается при получении наград)
                const creditBoost = Math.round(effectValue * 100);
                get().addLog(
                    `💰 Чёрный Ящик: +${creditBoost}% к кредитам`,
                    "info",
                );
                break;
            }

            // === УРОН ===
            case "crit_damage_boost": {
                // Матрица Перегрузки - критический урон (обрабатывается в бою)
                const critDamage = Math.round(effectValue * 100);
                get().addLog(
                    `⚡ Матрица Перегрузки: +${critDamage}% крит. урон`,
                    "info",
                );
                break;
            }

            // === Уклонение ===
            case "evasion_boost": {
                // Матрица Уклонения - бонус к уклонению (обрабатывается в getTotalEvasion)
                const evasionBoost = Math.round(effectValue * 100);
                get().addLog(`💨 Бонус к уклонению: +${evasionBoost}%`, "info");
                break;
            }

            // === МОДУЛЬНАЯ БРОНЯ ===
            case "module_armor": {
                // Кристаллическая Броня - бонус к защите (обрабатывается в calculateAverageDefense)
                const armorBonus = effectValue;
                get().addLog(
                    `🛡️ Кристаллическая Броня: +${armorBonus} к защите`,
                    "info",
                );
                break;
            }
        }
    });
};
