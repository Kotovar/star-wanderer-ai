import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import translationRU from "./locales/ru.json";
import translationEN from "./locales/en.json";

const resources = {
    ru: {
        translation: translationRU,
    },
    en: {
        translation: translationEN,
    },
};

// Only initialize i18n on client side
if (typeof window !== "undefined") {
    i18n.use(initReactI18next).init({
        resources,
        fallbackLng: "ru",
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        lng:
            typeof window !== "undefined"
                ? localStorage.getItem("i18nextLng") || "ru"
                : "ru",
    });
}

export default i18n;
