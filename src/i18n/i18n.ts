/**
 * Sistema de Internacionalização (i18n) e Acessibilidade Linguística
 * Suporta Português (pt-BR), Inglês (en-US) e Línguas Indígenas Brasileiras (Guarani Nhandewa - gn).
 * Persiste a preferência no localStorage ('micro_splash_locale').
 */

import ptBR from "./locales/pt-BR.json";
import enUS from "./locales/en-US.json";
import gn from "./locales/gn.json";

export type SupportedLocale = "pt-BR" | "en-US" | "gn";

export const LOCALES: Record<SupportedLocale, { label: string; dict: Record<string, any> }> = {
  "pt-BR": {
    label: "🇧🇷 Português",
    dict: ptBR,
  },
  "en-US": {
    label: "🇺🇸 English",
    dict: enUS,
  },
  gn: {
    label: "🌿 Avañe'ẽ (Guarani)",
    dict: gn,
  },
};

const STORAGE_KEY = "micro_splash_locale";

class I18nManager {
  private currentLocale: SupportedLocale = "pt-BR";
  private listeners: Array<(locale: SupportedLocale) => void> = [];

  constructor() {
    this.currentLocale = this.detectInitialLocale();
  }

  private detectInitialLocale(): SupportedLocale {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale;
      if (saved && LOCALES[saved]) {
        return saved;
      }
    }

    if (typeof navigator !== "undefined" && navigator.language) {
      const navLang = navigator.language.toLowerCase();
      if (navLang.startsWith("en")) return "en-US";
      if (navLang.startsWith("gn")) return "gn";
    }

    return "pt-BR";
  }

  public getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  public getLocaleLabel(): string {
    return LOCALES[this.currentLocale]?.label || LOCALES["pt-BR"].label;
  }

  public setLocale(locale: SupportedLocale): void {
    if (!LOCALES[locale]) return;
    this.currentLocale = locale;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, locale);
    }
    this.listeners.forEach((listener) => {
      try {
        listener(locale);
      } catch {}
    });
  }

  public cycleNextLocale(): SupportedLocale {
    const list: SupportedLocale[] = ["pt-BR", "en-US", "gn"];
    const idx = list.indexOf(this.currentLocale);
    const nextLocale = list[(idx + 1) % list.length];
    this.setLocale(nextLocale);
    return nextLocale;
  }

  public onLocaleChange(listener: (locale: SupportedLocale) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Resolve uma chave de tradução dot-separated (ex: 'menu.play')
   * com fallback transparente para o dicionário padrão pt-BR.
   */
  public t(key: string, params?: Record<string, string | number>): string {
    const activeDict = LOCALES[this.currentLocale]?.dict || ptBR;
    const fallbackDict = ptBR;

    let val = this.resolvePath(activeDict, key);
    if (val === undefined) {
      val = this.resolvePath(fallbackDict, key);
    }

    if (typeof val !== "string") {
      return key; // Retorna a própria chave caso não encontrada
    }

    if (params) {
      return Object.entries(params).reduce((acc, [paramKey, paramVal]) => {
        return acc.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
      }, val);
    }

    return val;
  }

  private resolvePath(obj: any, path: string): any {
    return path.split(".").reduce((acc, part) => {
      return acc && typeof acc === "object" ? acc[part] : undefined;
    }, obj);
  }
}

export const i18n = new I18nManager();
export const t = (key: string, params?: Record<string, string | number>) => i18n.t(key, params);
