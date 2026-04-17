import type { GameStore } from "./game";
import type { SetState } from "./state";

export type CrisisDataValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | null
  | undefined;

export type CrisisData = Record<string, CrisisDataValue>;

export interface GlobalCrisis {
  id: string;
  /** Ключ переводов: `crises.{id}.name` */
  nameKey: string;
  /** Ключ переводов: `crises.{id}.warning` */
  warningKey: string;
  /** Краткое описание сути кризиса */
  descriptionKey: string;
  /** Что именно кризис делает в игре */
  effectsKey: string;
  icon: string;
  /** Сколько ходов длится кризис */
  duration: number;
  /** Эффект при старте кризиса */
  onStartEffect?: (set: SetState, get: () => GameStore) => CrisisData | void;
  /** Эффект, применяемый каждый ход пока кризис активен */
  onTurnEffect: (
    set: SetState,
    get: () => GameStore,
    activeCrisis: ActiveCrisisState,
  ) => CrisisData | void;
  /** Эффект при завершении кризиса */
  onEndEffect?: (
    set: SetState,
    get: () => GameStore,
    activeCrisis: ActiveCrisisState,
  ) => void;
}

export interface ActiveCrisisState {
  id: string;
  turnsRemaining: number;
  data?: CrisisData;
}
