"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useData } from "./DataProvider";
import { AlertModal } from "./AlertModal";
import { Button, Notice, Unity } from "./ui";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/reading", label: "New Reading", icon: "▣" },
  { href: "/bill", label: "Bill Breakdown", icon: "₨" },
  { href: "/appliances", label: "Appliances", icon: "⌁" },
  { href: "/history", label: "History", icon: "↗" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

const titles: Record<string, string> = {
  "/dashboard": "Your energy at a glance",
  "/bill": "Bill breakdown",
  "/appliances": "My appliances",
  "/history": "Usage history",
  "/settings": "Settings",
};

const ALERT_SEEN = "unitsaver:alert-seen";

function seenAlert() {
  try {
    return Boolean(sessionStorage.getItem(ALERT_SEEN));
  } catch {
    return false;
  }
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { summary, warning, user } = useData();
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
        <nav aria-label="Main">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item ${path === item.href ? "active" : ""}`} aria-current={path === item.href ? "page" : undefined}>
              <i aria-hidden>{item.icon}</i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        {summary && (
          <div className="sidebar-tip">
            <Unity size={52} mood={summary.unitsSoFar > 200 ? "worried" : "happy"} />
            <span>
              <b>{summary.unitsSoFar} units</b>
              <small>{summary.alert ? "Careful – near 200!" : "You're doing great!"}</small>
            </span>
          </div>
        )}
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div>
            <p suppressHydrationWarning>{greeting()}</p>
            <h1>{titles[path] ?? "UnitSaver"}</h1>
          </div>
          <div className="top-actions">
            {path === "/dashboard" && <Button href="/reading">＋ New Reading</Button>}
            <button
              className="circle-button"
              aria-label={summary?.alert ? "Usage alert – open" : "No alerts"}
              onClick={() => summary?.alert && setManualOpen(true)}
            >
              ♢{summary?.alert && <i />}
            </button>
            <Link className="avatar" href="/settings" aria-label="Settings">
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
          {warning && <Notice>{warning}</Notice>}
          {children}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Main">
        {nav.slice(0, 5).map((item) => (
          <Link key={item.href} href={item.href} className={`nav-item ${path === item.href ? "active" : ""}`}>
            <i aria-hidden>{item.icon}</i>
            <span>{item.label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
      {path === "/dashboard" && (
        <Link className="mobile-fab" href="/reading" aria-label="New reading">
          ▣
        </Link>
      )}
      {alertOpen && <AlertModal close={closeAlert} />}
    </div>
  );
}
