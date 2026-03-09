"use client";

import { useCallback, useSyncExternalStore, useEffect } from "react";

// Translation resources
import translationRU from "./locales/ru.json";
import translationEN from "./locales/en.json";

const resources: Record<"ru" | "en", Record<string, unknown>> = {
    ru: translationRU,
    en: translationEN,
};

// Simple translation store
const store = {
    lng: "ru" as "ru" | "en",
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
            this.listeners.forEach((l) => l());
        }
    },

    t(key: string, params?: Record<string, string | number>): string {
        const keys = key.split(".");
        let value: unknown = resources[this.lng];
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
        this.listeners.forEach((l) => l());
    },

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    },

    getSnapshot() {
        return this.lng;
    },
};

// Initialize on client (but don't read localStorage yet)
if (typeof window !== "undefined") {
    store.init();
}

export function useTranslation() {
    const lng = useSyncExternalStore(
        store.subscribe.bind(store),
        store.getSnapshot.bind(store),
        // Server snapshot - always return 'ru' to match SSR
        () => "ru" as "ru" | "en",
    );

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
