import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en";
import ar from "./ar";
import ku from "./ku";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      ku: { translation: ku },
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "optiflow-lang",
      caches: ["localStorage"],
    },
  });

export default i18n;

export const RTL_LANGUAGES = ["ar", "ku"];

export function isRTL(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang);
}
