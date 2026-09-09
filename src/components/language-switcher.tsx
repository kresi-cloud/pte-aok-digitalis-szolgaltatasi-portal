import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLanguage, type Lang } from "@/lib/i18n/language";

const OPTIONS: { key: Lang; label: string; short: string }[] = [
  { key: "hu", label: "Magyar", short: "HU" },
  { key: "en", label: "English", short: "EN" },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-no-i18n
          aria-label={lang === "hu" ? "Nyelv választása" : "Select language"}
          className="flex items-center gap-1.5 rounded-sm border border-white/25 px-2 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/15"
        >
          <Globe className="size-4" aria-hidden="true" />
          {OPTIONS.find((o) => o.key === lang)?.short}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40" data-no-i18n>
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.key}
            onSelect={() => o.key !== lang && setLang(o.key)}
            className={cn(o.key === lang && "font-semibold")}
          >
            <span className="w-7 text-xs text-muted-foreground">{o.short}</span>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
