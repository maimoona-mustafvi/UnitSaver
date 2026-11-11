"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { applianceName, dirOf, LANG_COOKIE, localeOf, translate, type Key, type Lang, type Vars } from "@/i18n";
import { formatDate, monthLabel } from "@/lib/dates";

interface I18n {
  lang: Lang;
  /** false until the visitor has picked a language (no cookie yet). */
  chosen: boolean;
  setLang: (lang: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
  /** "Rs 1,234" / "1,234 روپے" */
  rs: (n: number) => string;
  month: (ym: string, withYear?: boolean) => string;
  date: (day: string) => string;
  appliance: (name: string) => string;
}

const Ctx = createContext<I18n | null>(null);

export function LanguageProvider({ initial, chosen: initiallyChosen, children }: { initial: Lang; chosen: boolean; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const [chosen, setChosen] = useState(initiallyChosen);

  const setLang = useCallback((next: Lang) => {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = dirOf(next);
    setLangState(next);
    setChosen(true);
  }, []);

  const value = useMemo<I18n>(() => {
    const t = (key: Key, vars?: Vars) => translate(lang, key, vars);
    const locale = localeOf(lang);
    return {
      lang,
      chosen,
      setLang,
      t,
      rs: (n) => t("common.rs", { n: Math.round(n).toLocaleString("en-PK") }),
      month: (ym, withYear = false) => monthLabel(ym, withYear, locale),
      date: (day) => formatDate(day, locale),
      appliance: (name) => applianceName(lang, name),
    };
  }, [lang, chosen, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <LanguageProvider>");
  return ctx;
}

/** Small EN / اردو toggle (shows the language you'd switch to). */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      type="button"
      className={`lang-switch ${className}`}
      lang={lang === "ur" ? "en" : "ur"}
      aria-label={t("lang.switchLabel")}
      onClick={() => setLang(lang === "ur" ? "en" : "ur")}
    >
      {t("lang.switch")}
    </button>
  );
}

/** First-visit chooser on the landing page: asks in both languages so everyone can read it. */
export function LanguageChooser() {
  const { chosen, setLang } = useI18n();
  if (chosen) return null;
  return (
    <div className="modal-overlay">
      <div className="lang-modal" role="dialog" aria-modal="true" aria-labelledby="lang-title">
        <div className="brand">
          <span className="brand-bolt">ϟ</span>UnitSaver
        </div>
        <h2 id="lang-title">
          <span lang="en">Choose your language</span>
          <span lang="ur" dir="rtl">
            اپنی زبان منتخب کریں
          </span>
        </h2>
        <div className="lang-options">
          <button type="button" className="lang-option" lang="ur" dir="rtl" onClick={() => setLang("ur")}>
            <b>اردو</b>
            <small>ایپ اردو میں استعمال کریں</small>
          </button>
          <button type="button" className="lang-option" lang="en" onClick={() => setLang("en")}>
            <b>English</b>
            <small>Use the app in English</small>
          </button>
        </div>
      </div>
    </div>
  );
}
