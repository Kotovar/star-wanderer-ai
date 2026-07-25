"use client";

import { useSyncExternalStore } from "react";
import { getMetaProgressSnapshot, subscribeMetaProgress } from "./store";
import { emptyMetaProgress } from "./storage";
import type { MetaProgressState } from "./types";

// Стабильная ссылка для SSR/начальной гидратации — в отличие от других
// useSyncExternalStore в этом кодбейзе (WelcomeTutorial.tsx, GalaxyMap.tsx,
// где subscribe — заглушка и значение не меняется за сессию), здесь подписка
// настоящая: прогресс может обновиться в этой же вкладке (забег закончился,
// пока модалка новой игры уже смонтирована) — см. store.ts.
const SERVER_SNAPSHOT: MetaProgressState = emptyMetaProgress();

export function useMetaProgress(): MetaProgressState {
  return useSyncExternalStore(
    subscribeMetaProgress,
    getMetaProgressSnapshot,
    () => SERVER_SNAPSHOT,
  );
}
