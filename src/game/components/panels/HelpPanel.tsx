"use client";

interface HelpPanelProps {
    onClose: () => void;
}

export function HelpPanel({ onClose }: HelpPanelProps) {
    return (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.9)] z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0f1a] border-2 border-[#00d4ff] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-[#00d4ff] sticky top-0 bg-[#0a0f1a]">
                    <h2 className="font-['Orbitron'] text-xl font-bold text-[#00d4ff]">
                        📖 БОРТОВОЙ ЖУРНАЛ
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[#ff0040] hover:text-white text-2xl font-bold cursor-pointer px-2"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6 text-sm">
                    {/* Introduction */}
                    <section>
                        <h3 className="text-[#ffb000] font-bold text-lg mb-2">
                            🌟 О ИГРЕ
                        </h3>
                        <p className="text-[#aaa]">
                            &quot;Звёздный странник&quot; — космическая игра,
                            где вы управляете кораблём, исследуете галактику,
                            торгуете, сражаетесь с пиратами и находите древние
                            артефакты.
                        </p>
                    </section>

                    {/* Ship Modules */}
                    <section>
                        <h3 className="text-[#00ff41] font-bold text-lg mb-2">
                            🚀 МОДУЛИ КОРАБЛЯ
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                                <span className="text-[#00ff41] font-bold">
                                    Реактор
                                </span>
                                <p className="text-[#888]">
                                    Производит энергию для корабля
                                </p>
                            </div>
                            <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                                <span className="text-[#00ff41] font-bold">
                                    Кабина
                                </span>
                                <p className="text-[#888]">
                                    Управление кораблём, уклонение
                                </p>
                            </div>
                            <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                                <span className="text-[#00ff41] font-bold">
                                    Жизнеобеспечение
                                </span>
                                <p className="text-[#888]">
                                    Кислород для экипажа
                                </p>
                            </div>
                            <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                                <span className="text-[#00ff41] font-bold">
                                    Склад
                                </span>
                                <p className="text-[#888]">
                                    Хранение грузов и товаров
                                </p>
                            </div>
                            <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                                <span className="text-[#00ff41] font-bold">
                                    Двигатель
                                </span>
                                <p className="text-[#888]">
                                    Путешествия между секторами
                                </p>
                            </div>
                            <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                                <span className="text-[#00ff41] font-bold">
                                    Топливный бак
                                </span>
                                <p className="text-[#888]">Запас топлива</p>
                            </div>
                            <div className="p-2 bg-[rgba(255,0,64,0.1)] border border-[#ff0040]">
                                <span className="text-[#ff0040] font-bold">
                                    Оружейная палуба
                                </span>
                                <p className="text-[#888]">
                                    Атака врагов (нужен стрелок)
                                </p>
                            </div>
                            <div className="p-2 bg-[rgba(0,128,255,0.1)] border border-[#0080ff]">
                                <span className="text-[#0080ff] font-bold">
                                    Щиты
                                </span>
                                <p className="text-[#888]">
                                    Защита от повреждений
                                </p>
                            </div>
                            <div className="p-2 bg-[rgba(0,212,255,0.1)] border border-[#00d4ff]">
                                <span className="text-[#00d4ff] font-bold">
                                    Сканер
                                </span>
                                <p className="text-[#888] text-xs mt-1">
                                    📡 Обнаружение объектов и аномалий
                                </p>
                                <p className="text-[#888] text-xs mt-1">
                                    ⚡ Выше радиус = лучше шанс:
                                </p>
                                <ul className="text-[#888] text-xs mt-1 space-y-0.5 ml-2">
                                    <li>
                                        • +2% к раскрытию сигналов бедствия за
                                        точку
                                    </li>
                                    <li>
                                        • +5% к обнаружению скрытых наград за
                                        точку
                                    </li>
                                    <li>
                                        • +3% к предупреждению засад за точку
                                    </li>
                                </ul>
                            </div>
                            <div className="p-2 bg-[rgba(255,170,0,0.1)] border border-[#ffaa00]">
                                <span className="text-[#ffaa00] font-bold">
                                    Бур
                                </span>
                                <p className="text-[#888]">
                                    Добыча ресурсов из астероидов
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 p-3 bg-[rgba(255,176,0,0.1)] border border-[#ffb000] text-xs">
                            <div className="text-[#ffb000] font-bold mb-1">
                                🔧 Перемещение модулей
                            </div>
                            <p className="text-[#aaa]">
                                Можно переместить{" "}
                                <strong>один модуль за ход</strong>. После
                                перемещения рамка корабля становится жёлтой 🔒.
                                Перемещённый модуль блокируется до конца хода.
                            </p>
                        </div>
                    </section>

                    {/* Crew */}
                    <section>
                        <h3 className="text-[#ffb000] font-bold text-lg mb-2">
                            👥 ЭКИПАЖ
                        </h3>
                        <div className="space-y-2 text-xs">
                            <div className="p-2 bg-[rgba(255,170,0,0.1)] border border-[#ffaa00]">
                                <span className="text-[#ffaa00] font-bold">
                                    Пилот
                                </span>
                                <span className="text-[#888] ml-2">
                                    — Уклонение в кабине, наведение в оружейной
                                    палубе
                                </span>
                            </div>
                            <div className="p-2 bg-[rgba(0,255,65,0.1)] border border-[#00ff41]">
                                <span className="text-[#00ff41] font-bold">
                                    Инженер
                                </span>
                                <span className="text-[#888] ml-2">
                                    — Ремонт модулей, перегрузка (+урон), разгон
                                    реактора
                                </span>
                            </div>
                            <div className="p-2 bg-[rgba(255,0,64,0.1)] border border-[#ff0040]">
                                <span className="text-[#ff0040] font-bold">
                                    Медик
                                </span>
                                <span className="text-[#888] ml-2">
                                    — Лечение экипажа, поднятие морали
                                </span>
                            </div>
                            <div className="p-2 bg-[rgba(0,212,255,0.1)] border border-[#00d4ff]">
                                <span className="text-[#00d4ff] font-bold">
                                    Учёный
                                </span>
                                <span className="text-[#888] ml-2">
                                    — Исследование аномалий и артефактов
                                </span>
                            </div>
                            <div className="p-2 bg-[rgba(0,128,255,0.1)] border border-[#0080ff]">
                                <span className="text-[#0080ff] font-bold">
                                    Разведчик
                                </span>
                                <span className="text-[#888] ml-2">
                                    — Разведка планет, поиск ресурсов
                                </span>
                            </div>
                            <div className="p-2 bg-[rgba(255,0,64,0.2)] border border-[#ff0040]">
                                <span className="text-[#ff0040] font-bold">
                                    Стрелок
                                </span>
                                <span className="text-[#888] ml-2">
                                    — Выбор цели в бою, +урон от оружия
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Races */}
                    <section>
                        <h3 className="text-[#ffb000] font-bold text-lg mb-2">
                            🌌 РАСЫ
                        </h3>
                        <div className="space-y-2 text-xs">
                            <div className="p-2 bg-[rgba(74,144,217,0.1)] border border-[#4a90d9]">
                                <span className="text-[#4a90d9] font-bold">
                                    👤 Люди
                                </span>
                                <span className="text-[#888] ml-2">
                                    — +10% настроение, +5 HP реген, +15% опыт
                                </span>
                            </div>
                            <div className="p-2 bg-[rgba(0,212,255,0.1)] border border-[#00d4ff]">
                                <span className="text-[#00d4ff] font-bold">
                                    🤖 Синтетики
                                </span>
                                <span className="text-[#888] ml-2">
                                    — +25% ремонт, +25% наука, нет усталости
                                </span>
                            </div>
                            <div className="p-2 bg-[rgba(170,85,255,0.1)] border border-[#aa55ff]">
                                <span className="text-[#aa55ff] font-bold">
                                    🦠 Ксеноморфы-симбионты
                                </span>
                                <span className="text-[#888] ml-2">
                                    — -25% энергия, +10 HP реген
                                </span>
                            </div>
                            <div className="p-2 bg-[rgba(255,102,0,0.1)] border border-[#ff6600]">
                                <span className="text-[#ff6600] font-bold">
                                    🦎 Крилорианцы
                                </span>
                                <span className="text-[#888] ml-2">
                                    — +35% бой, +15 HP, -10% уклонение врага
                                </span>
                            </div>
                            <div className="p-2 bg-[rgba(153,51,255,0.1)] border border-[#9933ff]">
                                <span className="text-[#9933ff] font-bold">
                                    👁️ Порождённые Пустотой
                                </span>
                                <span className="text-[#888] ml-2">
                                    — -20% топливо, +5 щиты/ход, -10% настроение
                                </span>
                            </div>
                            <div className="p-2 bg-[rgba(0,255,170,0.1)] border border-[#00ffaa]">
                                <span className="text-[#00ffaa] font-bold">
                                    💎 Кристаллоиды
                                </span>
                                <span className="text-[#888] ml-2">
                                    — +40% наука, +5% защита модулей, +15%
                                    артефакты
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Locations */}
                    <section>
                        <h3 className="text-[#ffb000] font-bold text-lg mb-2">
                            📍 ТИПЫ ЛОКАЦИЙ
                        </h3>
                        <div className="space-y-1 text-xs">
                            <p>
                                <span className="text-[#4a90a4]">
                                    🛰 Станция
                                </span>{" "}
                                <span className="text-[#888]">
                                    — Торговля, ремонт, найм экипажа, заправка
                                    топливом, утилизация модулей
                                </span>
                            </p>
                            <p>
                                <span className="text-[#4a7c59]">
                                    🌍 Планета
                                </span>{" "}
                                <span className="text-[#888]">
                                    — Задачи, разведка, получение эффектов
                                </span>
                            </p>
                            <p className="text-[10px] text-[#9933ff] ml-4">
                                🌟 У каждой расы на планете есть уникальная
                                активность:
                                <br />
                                • 👤 Люди: 🎓 Обучение экипажа (+1 уровень)
                                <br />
                                • 🤖 Синтетики: 📚 Сканирование сектора
                                <br />
                                • 🦠 Ксеноморфы-симбионты: 🧬 Улучшение
                                выживаемости экипажа
                                <br />
                                • 🦎 Крилорианцы: ⚔️ Боевые бонусы
                                <br />
                                • 👁️ Порождённые Пустотой: 🔮 Усиление
                                артефактов
                                <br />• 💎 Кристаллоиды: 💫 Улучшение систем
                                корабля
                            </p>
                            <p>
                                <span className="text-[#ff0040]">👾 Враг</span>{" "}
                                <span className="text-[#888]">
                                    — Бой, добыча кредитов
                                </span>
                            </p>
                            <p>
                                <span className="text-[#00ff41]">
                                    ⚡ Аномалия
                                </span>{" "}
                                <span className="text-[#888]">
                                    — Случайный эффект (нужен учёный)
                                </span>
                            </p>
                            <p>
                                <span className="text-[#2a6a8a]">
                                    🚀 Дружественный корабль
                                </span>{" "}
                                <span className="text-[#888]">
                                    — Торговля, найм, квесты
                                </span>
                            </p>
                            <p>
                                <span className="text-[#8b7355]">
                                    ☄️ Пояс астероидов
                                </span>{" "}
                                <span className="text-[#888]">
                                    — Добыча ресурсов (нужен бур)
                                </span>
                            </p>
                            <p>
                                <span className="text-[#00ff00]">☢️ Шторм</span>{" "}
                                <span className="text-[#888]">
                                    — Опасность и ресурсы
                                </span>
                            </p>
                            <p>
                                <span className="text-[#ffaa00]">
                                    🆘 Сигнал бедствия
                                </span>{" "}
                                <span className="text-[#888]">
                                    — Случайное событие
                                </span>
                            </p>
                            <p>
                                <span className="text-[#ff00ff]">
                                    💀 Древний босс
                                </span>{" "}
                                <span className="text-[#888]">
                                    — Сложный бой, гарантированный артефакт
                                </span>
                            </p>
                        </div>
                    </section>

                    {/* Combat */}
                    <section>
                        <h3 className="text-[#ff0040] font-bold text-lg mb-2">
                            ⚔️ БОЙ
                        </h3>
                        <ul className="text-[#888] text-xs space-y-1 list-disc list-inside">
                            <li>
                                Без стрелка урон -50%, цель выбирается случайно
                            </li>
                            <li>
                                Стрелок в оружейной палубе позволяет выбирать
                                цель
                            </li>
                            <li>При 0% брони — поражение</li>
                            <li>
                                Отступление наносит урон модулям и снижает
                                мораль экипажа
                            </li>
                            <li>Боссы регенерируют здоровье каждый ход</li>
                        </ul>
                    </section>

                    {/* Research */}
                    <section>
                        <h3 className="text-[#9933ff] font-bold text-lg mb-2">
                            🔬 НАУКА
                        </h3>
                        <p className="text-[#888] text-xs mb-2">
                            Откройте панель исследований (кнопка{" "}
                            <span className="text-[#9933ff] font-bold">
                                🔬 НАУКА
                            </span>{" "}
                            вверху) для изучения новых технологий.
                        </p>
                        <ul className="text-[#888] text-xs space-y-1 list-disc list-inside">
                            <li>
                                Исследования открывают новые возможности:
                                улучшение модулей, оружия, щитов
                            </li>
                            <li>Для исследований требуются ресурсы и время</li>
                            <li>
                                Учёные в экипаже ускоряют процесс исследований
                            </li>
                            <li>
                                Некоторые технологии требуют предварительного
                                изучения других
                            </li>
                        </ul>
                    </section>

                    {/* Tips */}
                    <section>
                        <h3 className="text-[#ffb000] font-bold text-lg mb-2">
                            💡 СОВЕТЫ
                        </h3>
                        <ul className="text-[#888] text-xs space-y-1 list-disc list-inside">
                            <li>Без сканера многие объекты в секторе скрыты</li>
                            <li>
                                📡 Сканер с высоким радиусом сканирования даёт
                                бонусы: раскрытие сигналов, обнаружение наград,
                                предупреждение засад
                            </li>
                            <li>
                                Следите за топливом — без него нельзя
                                путешествовать
                            </li>
                            <li>
                                Наём экипажа на станциях дешевле, чем у
                                дружественных кораблей
                            </li>
                            <li>Артефакты дают уникальные возможности</li>
                            <li>
                                Чёрные дыры телепортируют в случайный сектор
                            </li>
                            <li>
                                Уровни экипажа повышают эффективность их
                                способностей
                            </li>
                        </ul>
                    </section>

                    {/* Victory and Defeat */}
                    <section>
                        <h3 className="text-[#ff0040] font-bold text-lg mb-2">
                            ⚠️ Окончание игры
                        </h3>
                        <div className=" mb-1">
                            <p className="text-[#888] text-xs">
                                Исследуйте галактику, улучшайте корабль и
                                экипаж. Достигните самых отдалённых уголков
                                космоса, чтобы найти границу известной
                                галактики. Но помните — путь к границе открыт
                                только для тех, кто докажет свою готовность...
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
