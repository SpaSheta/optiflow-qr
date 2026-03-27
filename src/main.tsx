import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Set initial dir based on saved language
const savedLang = localStorage.getItem("optiflow-lang") || "en";
document.documentElement.dir = savedLang === "ar" || savedLang === "ku" ? "rtl" : "ltr";
document.documentElement.lang = savedLang;

createRoot(document.getElementById("root")!).render(<App />);
