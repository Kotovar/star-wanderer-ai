import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 1023px)";

function subscribe(callback: () => void): () => void {
    const mql = window.matchMedia(MOBILE_QUERY);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
    return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot(): boolean {
    return false;
}

/**
 * SSR-безопасное определение мобильного viewport (< lg).
 * Возвращает false на сервере и до первого замера на клиенте.
 */
export function useIsMobile(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
