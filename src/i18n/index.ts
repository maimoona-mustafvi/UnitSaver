import { en, type Key } from "./en";
import { ur, urApplianceNames } from "./ur";

export type Lang = "en" | "ur";
export type { Key };
export type Vars = Record<string, string | number>;

export const LANG_COOKIE = "lang";
export const isLang = (v: unknown): v is Lang => v === "en" || v === "ur";
export const dirOf = (lang: Lang) => (lang === "ur" ? "rtl" : "ltr");
/** Intl locale: Urdu month names, Western digits (as on Pakistani bills). */
export const localeOf = (lang: Lang) => (lang === "ur" ? "ur-PK" : "en-US");

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const s: string = (lang === "ur" ? ur : en)[key] ?? en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

export const applianceName = (lang: Lang, name: string) => (lang === "ur" ? (urApplianceNames[name] ?? name) : name);
