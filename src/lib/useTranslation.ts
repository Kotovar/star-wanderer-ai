"use client";

import { useCallback, useSyncExternalStore, useEffect } from "react";

// Translation resources: русский (язык по умолчанию и fallback) в бандле,
// английский подгружается лениво отдельным чанком.
import translationRU from "./locales/ru.json";

const resources: Record<"ru" | "en", Record<string, unknown> | null> = {
    ru: translationRU,
    en: null,
};

const loadEnglish = () => {
    if (resources.en) return;
    import("./locales/en.json").then((m) => {
        resources.en = m.default;
        store.rev++;
        store.listeners.forEach((l) => l());
    });
};

// Simple translation store
export const store = {
    lng: "ru" as "ru" | "en",
    // Растёт при каждом изменении языка/каталога, чтобы useSyncExternalStore видел обновление
    rev: 0,
    isHydrated: false,
    listeners: new Set<() => void>(),

    init() {
        if (typeof window !== "undefined" && !this.isHydrated) {
            // Don't read from localStorage until after hydration
            this.lng = "ru";
        }
    },

    hydrate() {
        if (typeof window !== "undefined" && !this.isHydrated) {
            this.isHydrated = true;
            this.lng =
                (localStorage.getItem("i18nextLng") as "ru" | "en") || "ru";
            if (this.lng === "en") loadEnglish();
            this.rev++;
            this.listeners.forEach((l) => l());
        }
    },

    t(key: string, params?: Record<string, string | number>): string {
        const keys = key.split(".");
        // Пока английский каталог не загружен, показываем русский
        let value: unknown = resources[this.lng] ?? resources.ru;
        for (const k of keys) {
            if (value && typeof value === "object" && k in value) {
                value = (value as Record<string, unknown>)[k];
            } else {
                return key;
            }
        }
        let result = typeof value === "string" ? value : key;

        // Replace placeholders like {{param}} with actual values
        if (params) {
            for (const [paramKey, paramValue] of Object.entries(params)) {
                result = result.replace(
                    new RegExp(`\\{\\{${paramKey}\\}\\}`, "g"),
                    String(paramValue),
                );
            }
        }

        return result;
    },

    changeLanguage(lng: "ru" | "en") {
        this.lng = lng;
        this.isHydrated = true;
        localStorage.setItem("i18nextLng", lng);
        if (lng === "en") loadEnglish();
        this.rev++;
        this.listeners.forEach((l) => l());
    },

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    },

    getSnapshot() {
        // rev в снапшоте заставляет подписчиков перерисоваться при загрузке каталога
        return `${this.lng}:${this.rev}`;
    },
};

// Initialize on client (but don't read localStorage yet)
if (typeof window !== "undefined") {
    store.init();
}

export function useTranslation() {
    const snapshot = useSyncExternalStore(
        store.subscribe.bind(store),
        store.getSnapshot.bind(store),
        // Server snapshot - always return 'ru' to match SSR
        () => "ru:0",
    );
    const lng = snapshot.split(":")[0] as "ru" | "en";

    // Hydrate after initial render - this will read from localStorage and trigger update if needed
    useEffect(() => {
        store.hydrate();
    }, []);

    const t = useCallback(
        (key: string, params?: Record<string, string | number>): string => {
            return store.t(key, params);
        },
        [],
    );

    const changeLanguage = useCallback((newLng: "ru" | "en") => {
        store.changeLanguage(newLng);
    }, []);

    return {
        t,
        changeLanguage,
        currentLanguage: lng,
    };
}

export default useTranslation;
