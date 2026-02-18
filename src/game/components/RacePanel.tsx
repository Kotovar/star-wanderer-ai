'use client';

import { useGameStore } from '../store';
import { RACES } from '../constants';
import type { RaceId } from '../types';

export function RacePanel() {
  const knownRaces = useGameStore(s => s.knownRaces);
  
  if (knownRaces.length === 0) return null;
  
  return (
    <div className="bg-[#0a0f14] border-2 border-[#00ff41] p-4">
      <h3 className="text-[#00ff41] font-bold text-lg mb-3 flex items-center gap-2">
        <span>🌍</span>
        <span>ИЗВЕСТНЫЕ РАСЫ</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {knownRaces.map(raceId => {
          const race = RACES[raceId];
          if (!race) return null;
          
          return (
            <div 
              key={raceId}
              className="border p-3"
              style={{ borderColor: race.color, backgroundColor: `${race.color}10` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{race.icon}</span>
                <div>
                  <div className="font-bold" style={{ color: race.color }}>
                    {race.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {race.pluralName}
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-300 mb-2">{race.description}</p>
              
              {/* Bonuses */}
              <div className="mb-2">
                <div className="text-xs text-[#00ff41] font-bold mb-1">БОНУСЫ:</div>
                <div className="flex flex-wrap gap-1">
                  {race.crewBonuses.happiness && (
                    <span className="text-xs bg-[#00ff4120] text-[#00ff41] px-1 rounded">
                      😊 +{race.crewBonuses.happiness}%
                    </span>
                  )}
                  {race.crewBonuses.repair && (
                    <span className="text-xs bg-[#ffb00020] text-[#ffb000] px-1 rounded">
                      🔧 +{Math.round(race.crewBonuses.repair * 100)}% ремонт
                    </span>
                  )}
                  {race.crewBonuses.science && (
                    <span className="text-xs bg-[#00d4ff20] text-[#00d4ff] px-1 rounded">
                      🔬 +{Math.round(race.crewBonuses.science * 100)}% наука
                    </span>
                  )}
                  {race.crewBonuses.combat && (
                    <span className="text-xs bg-[#ff004020] text-[#ff0040] px-1 rounded">
                      ⚔️ +{Math.round(race.crewBonuses.combat * 100)}% бой
                    </span>
                  )}
                  {race.crewBonuses.energy && (
                    <span className="text-xs bg-[#9933ff20] text-[#9933ff] px-1 rounded">
                      ⚡ -{Math.round(Math.abs(race.crewBonuses.energy) * 100)}% расход энергии
                    </span>
                  )}
                  {race.crewBonuses.adaptation && (
                    <span className="text-xs bg-[#00ffaa20] text-[#00ffaa] px-1 rounded">
                      🌍 +{Math.round(race.crewBonuses.adaptation * 100)}% адаптация
                    </span>
                  )}
                  {race.crewBonuses.fuelEfficiency && (
                    <span className="text-xs bg-[#ff660020] text-[#ff6600] px-1 rounded">
                      🚀 -{Math.round(race.crewBonuses.fuelEfficiency * 100)}% расход топлива
                    </span>
                  )}
                </div>
              </div>
              
              {/* Special traits */}
              <div className="mb-2">
                <div className="text-xs text-[#ffaa00] font-bold mb-1">ОСОБЕННОСТИ:</div>
                <div className="space-y-1">
                  {race.specialTraits.map(trait => (
                    <div 
                      key={trait.id}
                      className={`text-xs px-2 py-1 rounded ${
                        trait.type === 'positive' ? 'bg-[#00ff4120] text-[#00ff41]' :
                        trait.type === 'negative' ? 'bg-[#ff004020] text-[#ff0040]' :
                        'bg-[#88888820] text-[#888888]'
                      }`}
                    >
                      {trait.name}: {trait.description}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Biology */}
              <div className="text-xs text-gray-400">
                <div>📏 Продолжительность жизни: {race.biology.lifespan}</div>
                <div>🍽️ Питание: {race.biology.diet === 'synthetic' ? 'Синтетическое' : race.biology.diet}</div>
                {!race.hasHappiness && <div className="text-[#ffaa00]">⚠️ Не имеет счастья</div>}
                {!race.hasFatigue && <div className="text-[#00ff41]">✓ Не устаёт</div>}
                {!race.canGetSick && <div className="text-[#00ff41]">✓ Не болеет</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mini race badge for crew display
export function RaceBadge({ raceId }: { raceId: RaceId }) {
  const race = RACES[raceId];
  if (!race) return null;
  
  return (
    <span 
      className="text-xs px-1.5 py-0.5 rounded border flex items-center gap-1"
      style={{ 
        borderColor: race.color, 
        color: race.color,
        backgroundColor: `${race.color}20`
      }}
    >
      <span>{race.icon}</span>
      <span>{race.name}</span>
    </span>
  );
}

// Population display for planets/stations
export function PopulationDisplay({ raceId, population }: { raceId?: RaceId; population?: number }) {
  const knownRaces = useGameStore(s => s.knownRaces);
  
  if (!raceId) return null;
  
  const race = RACES[raceId];
  const isKnown = knownRaces.includes(raceId);
  
  if (!race) return null;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span 
        className="px-2 py-1 rounded border"
        style={{ 
          borderColor: race.color, 
          color: race.color,
          backgroundColor: `${race.color}15`
        }}
      >
        {race.icon} {isKnown ? race.pluralName : '???'}
      </span>
      {population && (
        <span className="text-gray-400">
          👥 {population.toLocaleString()} тыс.
        </span>
      )}
    </div>
  );
}
