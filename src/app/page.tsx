"use client";

import Link from "next/link";
import { HeaderAuth, HeroAuth } from "@/components/AuthActions";
import { LanguageChooser, LanguageSwitch, useI18n } from "@/components/LanguageProvider";
import { C, Card, Unity } from "@/components/ui";
import type { Key } from "@/i18n";

const features: { title: Key; text: Key; color: string; icon: string }[] = [
  { title: "landing.f1", text: "landing.f1Text", color: C.lime, icon: "◉" },
  { title: "landing.f2", text: "landing.f2Text", color: C.pink, icon: "₨" },
  { title: "landing.f3", text: "landing.f3Text", color: C.blue, icon: "✓" },
  { title: "landing.f4", text: "landing.f4Text", color: C.mint, icon: "♧" },
];

const steps: [Key, Key][] = [
  ["landing.s1", "landing.s1Text"],
  ["landing.s2", "landing.s2Text"],
  ["landing.s3", "landing.s3Text"],
];

export default function Landing() {
  const { t } = useI18n();
  return (
    <div className="landing">
      <header className="landing-header">
        <Link className="brand brand-light" href="/">
          <span className="brand-bolt">ϟ</span>UnitSaver
        </Link>
        <nav>
          <a href="#features">{t("landing.features")}</a>
          <a href="#how">{t("landing.how")}</a>
        </nav>
        <div className="landing-actions">
          <LanguageSwitch className="on-blue" />
          <HeaderAuth />
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">{t("landing.eyebrow")}</div>
            <h1>{t("landing.title")}</h1>
            <p>{t("landing.subtitle")}</p>
            <HeroAuth />
          </div>
          <div className="hero-art">
            <div className="hello-burst">{t("landing.hello")}</div>
            <div className="speech">{t("landing.speech")}</div>
            <div className="orb pink" />
            <div className="orb pale" />
            <Unity size={205} />
          </div>
        </section>
        <section className="landing-white" id="features">
          <div className="section-heading">
            <span>01</span>
            <div>
              <p>{t("landing.whyKicker")}</p>
              <h2>{t("landing.whyTitle")}</h2>
            </div>
          </div>
          <div className="features-grid">
            {features.map((f) => (
              <Card key={f.title} className={f.color === C.blue ? "dark-card feature-card" : "feature-card"} style={{ background: f.color }}>
                <div className="feature-icon" aria-hidden>
                  {f.icon}
                </div>
                <h3>{t(f.title)}</h3>
                <p>{t(f.text)}</p>
              </Card>
            ))}
          </div>
          <section className="how" id="how">
            <div className="section-heading">
              <span>02</span>
              <div>
                <p>{t("landing.howKicker")}</p>
                <h2>{t("landing.howTitle")}</h2>
              </div>
            </div>
            <div className="steps">
              {steps.map(([title, text], i) => (
                <div className="step" key={title}>
                  <b>{i + 1}</b>
                  <div>
                    <h3>{t(title)}</h3>
                    <p>{t(text)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
      <footer>
        <div className="brand brand-light">
          <span className="brand-bolt">ϟ</span>UnitSaver
        </div>
        <p>{t("landing.footer")}</p>
        <span>{t("landing.footerNote")}</span>
      </footer>
      <LanguageChooser />
    </div>
  );
}
