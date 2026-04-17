import type { GameStore } from "./game";
import type { SetState } from "./state";

export interface GlobalCrisis {
  id: string;
  /** Ключ переводов: `crises.{id}.name` */
  nameKey: string;
  /** Ключ переводов: `crises.{id}.warning` */
  warningKey: string;
  icon: string;
  /** Сколько ходов длится кризис */
  duration: number;
  /** Эффект, применяемый каждый ход пока кризис активен */
  onTurnEffect: (set: SetState, get: () => GameStore) => void;
}

export interface ActiveCrisisState {
  id: string;
  turnsRemaining: number;
}
