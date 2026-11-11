"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { Key } from "@/i18n";
import { useData } from "./DataProvider";
import { AlertModal } from "./AlertModal";
import { LanguageSwitch, useI18n } from "./LanguageProvider";
import { Button, Notice, Unity } from "./ui";

const nav: { href: string; label: Key; short: Key; icon: string }[] = [
  { href: "/dashboard", label: "nav.dashboard", short: "nav.short.dashboard", icon: "⌂" },
  { href: "/reading", label: "nav.reading", short: "nav.short.reading", icon: "▣" },
  { href: "/bill", label: "nav.bill", short: "nav.short.bill", icon: "₨" },
  { href: "/appliances", label: "nav.appliances", short: "nav.short.appliances", icon: "⌁" },
  { href: "/history", label: "nav.history", short: "nav.short.history", icon: "↗" },
  { href: "/settings", label: "nav.settings", short: "nav.settings", icon: "⚙" },
];

const titles: Record<string, Key> = {
  "/dashboard": "title.dashboard",
  "/bill": "title.bill",
  "/appliances": "title.appliances",
  "/history": "title.history",
  "/settings": "title.settings",
};

const ALERT_SEEN = "unitsaver:alert-seen";

function seenAlert() {
  try {
    return Boolean(sessionStorage.getItem(ALERT_SEEN));
  } catch {
    return false;
  }
}

function greeting(): Key {
  const h = new Date().getHours();
  return h < 12 ? "greet.morning" : h < 17 ? "greet.afternoon" : "greet.evening";
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { summary, warning, user } = useData();
  const { t } = useI18n();
  const [manualOpen, setManualOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // summary only exists on the client (data loads after mount), so reading sessionStorage here is hydration-safe.
  const alertOpen = manualOpen || (Boolean(summary?.alert) && path === "/dashboard" && !dismissed && !seenAlert());
  const closeAlert = () => {
    try {
      sessionStorage.setItem(ALERT_SEEN, "1");
    } catch {}
    setDismissed(true);
    setManualOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand brand-light" href="/">
          <span className="brand-bolt">ϟ</span>
          <span>UnitSaver</span>
        </Link>
        <nav aria-label={t("common.mainNav")}>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item ${path === item.href ? "active" : ""}`} aria-current={path === item.href ? "page" : undefined}>
              <i aria-hidden>{item.icon}</i>
              <span>{t(item.label)}</span>
            </Link>
          ))}
        </nav>
        {summary && (
          <div className="sidebar-tip">
            <Unity size={52} mood={summary.unitsSoFar > 200 ? "worried" : "happy"} />
            <span>
              <b>{t("common.unitsN", { n: summary.unitsSoFar })}</b>
              <small>{summary.alert ? t("shell.careful") : t("shell.great")}</small>
            </span>
          </div>
        )}
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div>
            <p suppressHydrationWarning>{t(greeting())}</p>
            <h1>{titles[path] ? t(titles[path]) : "UnitSaver"}</h1>
          </div>
          <div className="top-actions">
            {path === "/dashboard" && <Button href="/reading">{t("shell.newReading")}</Button>}
            <LanguageSwitch />
            <button
              className="circle-button"
              aria-label={summary?.alert ? t("shell.alertOpen") : t("shell.noAlerts")}
              onClick={() => summary?.alert && setManualOpen(true)}
            >
              ♢{summary?.alert && <i />}
            </button>
            <Link className="avatar" href="/settings" aria-label={t("nav.settings")}>
              {user?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- Google avatar URL
                <img src={user.photo} alt="" referrerPolicy="no-referrer" />
              ) : (
                (user?.name?.[0] ?? "ME").toUpperCase()
              )}
            </Link>
          </div>
        </header>
        <main className="page-content">
          {warning && <Notice>{t(warning)}</Notice>}
          {children}
        </main>
      </div>
      <nav className="bottom-nav" aria-label={t("common.mainNav")}>
        {nav.slice(0, 5).map((item) => (
          <Link key={item.href} href={item.href} className={`nav-item ${path === item.href ? "active" : ""}`}>
            <i aria-hidden>{item.icon}</i>
            <span>{t(item.short)}</span>
          </Link>
        ))}
      </nav>
      {path === "/dashboard" && (
        <Link className="mobile-fab" href="/reading" aria-label={t("nav.reading")}>
          ▣
        </Link>
      )}
      {alertOpen && <AlertModal close={closeAlert} />}
    </div>
  );
}
