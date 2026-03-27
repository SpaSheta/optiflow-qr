import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇮🇶" },
  { code: "ku", label: "کوردی", flag: "🇮🇶" },
] as const;

interface LanguageSwitcherProps {
  variant?: "default" | "ghost" | "minimal";
  className?: string;
}

const LanguageSwitcher = ({ variant = "default", className }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  const currentLang = LANGS.find((l) => l.code === i18n.language) || LANGS[0];

  const switchLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("optiflow-lang", code);
    // Update dir attribute
    document.documentElement.dir = code === "ar" || code === "ku" ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
            variant === "default" && "border border-border bg-card text-foreground hover:bg-muted",
            variant === "ghost" && "text-white/70 hover:text-white hover:bg-white/10",
            variant === "minimal" && "text-muted-foreground hover:text-foreground",
            className
          )}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {LANGS.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLang(lang.code)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              i18n.language === lang.code && "bg-primary/10 font-semibold"
            )}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
