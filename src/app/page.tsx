import Link from "next/link";
import { Button, C, Card, Unity } from "@/components/ui";

const features = [
  { title: "Snap & Calculate", color: C.lime, text: "A photo is all it takes.", icon: "◉" },
  { title: "Bill with All Taxes", color: C.pink, text: "No surprise charges.", icon: "₨" },
  { title: "Protected Status Guard", color: C.blue, text: "Stay safely under 200.", icon: "✓" },
  { title: "CO₂ Saved", color: C.mint, text: "See your positive impact.", icon: "♧" },
];

const steps = [
  ["Upload your bill", "We read your last reading and 12-month history."],
  ["Snap your meter", "Our AI spots the digits."],
  ["Get your bill & tips", "Plan your usage with confidence."],
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link className="brand brand-light" href="/">
          <span className="brand-bolt">ϟ</span>UnitSaver
        </Link>
        <nav>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
        </nav>
        <Button variant="white" href="/dashboard">
          Open app
        </Button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">Pakistan&apos;s friendly energy coach</div>
            <h1>Save every unit with UnitSaver</h1>
            <p>Track your units, know your bill before it arrives, and stay protected under 200 units.</p>
            <Button variant="lime" href="/setup">
              Get Started <span>→</span>
            </Button>
          </div>
          <div className="hero-art">
            <div className="hello-burst">HELLO!</div>
            <div className="speech">Let&apos;s save!</div>
            <div className="orb pink" />
            <div className="orb pale" />
            <Unity size={205} />
          </div>
        </section>
        <section className="landing-white" id="features">
          <div className="section-heading">
            <span>01</span>
            <div>
              <p>WHY UNITSAVER?</p>
              <h2>Big savings, made simple.</h2>
            </div>
          </div>
          <div className="features-grid">
            {features.map((f) => (
              <Card key={f.title} className={f.color === C.blue ? "dark-card feature-card" : "feature-card"} style={{ background: f.color }}>
                <div className="feature-icon" aria-hidden>
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </Card>
            ))}
          </div>
          <section className="how" id="how">
            <div className="section-heading">
              <span>02</span>
              <div>
                <p>HOW IT WORKS</p>
                <h2>Three tiny steps.</h2>
              </div>
            </div>
            <div className="steps">
              {steps.map(([title, text], i) => (
                <div className="step" key={title}>
                  <b>{i + 1}</b>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
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
        <p>Small changes. Big savings. A cooler planet.</p>
        <span>Made for Pakistani homes · SDG 7 · 12 · 13</span>
      </footer>
    </div>
  );
}
