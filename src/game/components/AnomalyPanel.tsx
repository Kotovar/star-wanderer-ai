'use client';

import { useGameStore } from '../store';
import { Button } from '@/components/ui/button';

export function AnomalyPanel() {
  const currentLocation = useGameStore(s => s.currentLocation);
  const crew = useGameStore(s => s.crew);
  const completedLocations = useGameStore(s => s.completedLocations);
  const log = useGameStore(s => s.log);
  const handleAnomaly = useGameStore(s => s.handleAnomaly);
  const showSectorMap = useGameStore(s => s.showSectorMap);

  if (!currentLocation) return null;

  const reqLevel = currentLocation.requiresScientistLevel || 1;
  const scientists = crew.filter(c => c.profession === 'scientist');
  const maxScientistLevel = scientists.length > 0 ? Math.max(...scientists.map(s => s.level || 1)) : 0;
  const canResearch = maxScientistLevel >= reqLevel;

  // Check if anomaly was already researched
  const anomalyCompleted = completedLocations.includes(currentLocation.id);

  // Get recent anomaly-related log entries
  const recentAnomalyLogs = log.slice(0, 10).filter(entry =>
    entry.message.includes('Аномалия:') ||
    entry.message.includes('аномали')
  );

  // Already processed - show results
  if (anomalyCompleted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
          ▸ АНОМАЛИЯ LV{reqLevel}
        </div>

        <div className="bg-[rgba(0,0,0,0.4)] p-3 border border-[#ffb000]">
          <p className="text-[#ffb000] mb-3 font-bold">Результаты:</p>
          <div className="space-y-1.5 text-sm">
            {recentAnomalyLogs.map((entry, i) => (
              <div key={i} className={`
                ${entry.type === 'warning' ? 'text-[#ff4444]' : ''}
                ${entry.type === 'info' && entry.message.includes('+') ? 'text-[#00ff41]' : ''}
                ${entry.type === 'info' && !entry.message.includes('+') ? 'text-[#888]' : ''}
              `}>
                {entry.message}
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={showSectorMap}
          className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
        >
          ПОКИНУТЬ АНОМАЛИЮ
        </Button>
      </div>
    );
  }

  if (!canResearch) {
    return (
      <div className="flex flex-col gap-4">
        <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
          ▸ АНОМАЛИЯ УРОВНЯ {reqLevel}
        </div>
        <div className="text-sm leading-relaxed">
          <span className="text-[#ff0040]">⚠ Аномалия слишком сложна для исследования!</span>
          <br /><br />
          Требуется учёный уровня <span className="text-[#ffb000]">{reqLevel}</span> или выше.
          <br /><br />
          <span className="text-[#888]">Ваши учёные: {scientists.length > 0 ? `LV${maxScientistLevel}` : 'нет'}</span>
        </div>
        <Button
          onClick={showSectorMap}
          className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider"
        >
          ОТСТУПИТЬ
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
        ▸ АНОМАЛИЯ LV{reqLevel}
      </div>
      <div className="text-sm leading-relaxed">
        Обнаружена <span className={currentLocation.anomalyType === 'good' ? 'text-[#00ff41]' : 'text-[#ff0040]'}>
          {currentLocation.anomalyType === 'good' ? 'благоприятная' : 'опасная'}
        </span> аномалия.
        <br /><br />
        Уровень сложности: <span className="text-[#ffb000]">{reqLevel}</span>
        <br />
        Ваши учёные: <span className="text-[#00ff41]">LV{maxScientistLevel}</span> ✓
      </div>
      <div className="flex gap-3">
        <Button
          onClick={() => handleAnomaly(currentLocation)}
          className="flex-1 bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
        >
          ИССЛЕДОВАТЬ
        </Button>
        <Button
          onClick={showSectorMap}
          className="bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)] uppercase tracking-wider"
        >
          ОТСТУПИТЬ
        </Button>
      </div>
    </div>
  );
}
