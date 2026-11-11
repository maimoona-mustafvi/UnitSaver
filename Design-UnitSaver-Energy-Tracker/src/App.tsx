import { useState, type ReactNode } from "react";

type Page =
  | "landing"
  | "setup"
  | "reading"
  | "dashboard"
  | "bill"
  | "appliances"
  | "history"
  | "settings";

const C = {
  blue: "#213F99",
  lime: "#D4EE5E",
  pale: "#E4F5A1",
  pink: "#F38FD8",
  magenta: "#E544B5",
  mint: "#B7EED8",
  ink: "#111111",
  grey: "#EDEDED",
};

const nav: { page: Page; label: string; icon: string }[] = [
  { page: "dashboard", label: "Dashboard", icon: "⌂" },
  { page: "reading", label: "New Reading", icon: "▣" },
  { page: "bill", label: "Bill Breakdown", icon: "₨" },
  { page: "appliances", label: "Appliances", icon: "⌁" },
  { page: "history", label: "History", icon: "↗" },
  { page: "settings", label: "Settings", icon: "⚙" },
];

function Unity({
  mood = "happy",
  size = 130,
}: {
  mood?: "happy" | "thinking" | "worried" | "celebrate";
  size?: number;
}) {
  const mouth =
    mood === "worried"
      ? "M49 72 Q58 64 67 72"
      : mood === "thinking"
        ? "M51 69 Q58 72 64 69"
        : "M48 68 Q58 78 68 68";
  return (
    <svg
      viewBox="0 0 120 150"
      width={size}
      height={size * 1.25}
      role="img"
      aria-label={`Unity mascot feeling ${mood}`}
      className="unity"
    >
      <path
        d="M70 5 24 76h29l-8 66 52-82H68z"
        fill={C.lime}
        stroke={C.ink}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="49" cy="55" r="3.5" fill={C.ink} />
      <circle cx="67" cy="55" r="3.5" fill={C.ink} />
      <path d={mouth} fill="none" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
      <path
        d={
          mood === "celebrate"
            ? "M30 78Q8 50 12 31M83 77q28-10 29-31"
            : "M31 80Q10 88 8 104M85 78q21 10 24 27"
        }
        fill="none"
        stroke={C.ink}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M48 135q-4 10-16 10M72 126q5 12 17 12"
        fill="none"
        stroke={C.ink}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {mood === "thinking" && (
        <path d="M86 30q8-10 15-2t-3 14" fill={C.mint} stroke={C.ink} strokeWidth="3" />
      )}
      {mood === "worried" && <path d="M81 38q7 9 0 14-7-5 0-14" fill={C.blue} />}
    </svg>
  );
}

function AIBadge() {
  return <span className="ai-badge">AI</span>;
}

function Button({
  children,
  onClick,
  variant = "blue",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "blue" | "lime" | "white";
  className?: string;
}) {
  return (
    <button className={`button ${variant} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`card ${className}`} style={style}>
      {children}
    </section>
  );
}

function Landing({ go }: { go: (page: Page) => void }) {
  const features = [
    ["Snap & Calculate", C.lime, "A photo is all it takes.", "scan"],
    ["Bill with All Taxes", C.pink, "No surprise charges.", "bill"],
    ["Protected Status Guard", C.blue, "Stay safely under 200.", "shield"],
    ["CO₂ Saved", C.mint, "See your positive impact.", "leaf"],
  ];
  return (
    <div className="landing">
      <header className="landing-header">
        <button className="brand brand-light" onClick={() => go("landing")}>
          <span className="brand-bolt">ϟ</span>UnitSaver
        </button>
        <nav>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
        </nav>
        <Button variant="white" onClick={() => go("dashboard")}>
          Login
        </Button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">Pakistan's friendly energy coach</div>
            <h1>Save every unit with UnitSaver</h1>
            <p>
              Track your units, know your bill before it arrives, and stay protected under 200
              units.
            </p>
            <Button variant="lime" onClick={() => go("setup")}>
              Get Started <span>→</span>
            </Button>
          </div>
          <div className="hero-art">
            <div className="hello-burst">HELLO!</div>
            <div className="speech">Let's save!</div>
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
            {features.map(([title, color, text, icon]) => (
              <Card
                key={title}
                className={color === C.blue ? "dark-card feature-card" : "feature-card"}
                style={{ background: color }}
              >
                <div className="feature-icon">
                  {icon === "shield" ? "✓" : icon === "leaf" ? "♧" : icon === "bill" ? "₨" : "◉"}
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
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
              {["Upload your bill", "Snap your meter", "Get your bill & tips"].map((step, i) => (
                <div className="step" key={step}>
                  <b>{i + 1}</b>
                  <div>
                    <h3>{step}</h3>
                    <p>
                      {i === 0
                        ? "We securely read your tariff."
                        : i === 1
                          ? "Our AI spots the digits."
                          : "Plan your usage with confidence."}
                    </p>
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
        <span>Made for Pakistani homes.</span>
      </footer>
    </div>
  );
}

function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="stepbar">
      <div className={step >= 1 ? "active" : ""} />
      <div className={step >= 2 ? "active" : ""} />
      <span>Step {step} of 2</span>
    </div>
  );
}

function Setup({ go }: { go: (page: Page) => void }) {
  const [manual, setManual] = useState(false);
  const [scanned, setScanned] = useState(false);
  return (
    <div className="onboarding-page">
      <button className="back-link" onClick={() => go("landing")}>
        ← Back
      </button>
      <div className="onboarding-layout">
        <aside className="onboarding-art">
          <div className="mini-bubble">Your data stays yours.</div>
          <Unity mood={scanned ? "celebrate" : "thinking"} size={180} />
        </aside>
        <main className="setup-card">
          <StepBar step={1} />
          <h1>Add last month's bill</h1>
          <p className="subtle">
            Upload a photo of your bill. We'll read your last meter reading and 12-month history.
          </p>
          <div className="segmented">
            <button className={!manual ? "selected" : ""} onClick={() => setManual(false)}>
              Upload Bill Photo
            </button>
            <button className={manual ? "selected" : ""} onClick={() => setManual(true)}>
              Enter Manually
            </button>
          </div>
          {!manual ? (
            <>
              {!scanned ? (
                <button className="upload-zone" onClick={() => setScanned(true)}>
                  <span>↑</span>
                  <b>Drop bill photo or click to upload</b>
                  <small>JPG, PNG or PDF · max 10MB</small>
                  <em>Take Photo</em>
                </button>
              ) : (
                <div className="result-preview">
                  <div className="result-title">
                    <b>Bill read successfully</b>
                    <AIBadge />
                  </div>
                  {[
                    ["Bill month", "July 2025"],
                    ["Previous reading", "50,875"],
                    ["Tariff", "Residential"],
                    ["Meter type", "Normal"],
                  ].map(([a, b]) => (
                    <div className="field-row" key={a}>
                      <span>{a}</span>
                      <b>{b}</b>
                      <button>✎</button>
                    </div>
                  ))}
                  <div className="mini-history">
                    {[122, 148, 176, 132, 191, 164].map((n, i) => (
                      <div key={i}>
                        <i style={{ height: `${n / 3}px` }} />
                        <small>{["Feb", "Mar", "Apr", "May", "Jun", "Jul"][i]}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="form-grid">
              <label>
                Last meter reading
                <input defaultValue="50875" />
              </label>
              <label>
                Reading date
                <input type="date" defaultValue="2025-07-01" />
              </label>
              <label className="full">
                Last 6 months' units
                <div className="unit-inputs">
                  {[122, 148, 176, 132, 191, 164].map((n, i) => (
                    <input key={i} defaultValue={n} />
                  ))}
                </div>
              </label>
            </div>
          )}
          <Button onClick={() => go("reading")} className="full-button">
            Continue →
          </Button>
          <p className="privacy">▣ Your bill stays private. Personal details are not stored.</p>
        </main>
      </div>
    </div>
  );
}

function Reading({ go }: { go: (page: Page) => void }) {
  const [done, setDone] = useState(false);
  return (
    <div className="simple-page">
      <button className="back-link" onClick={() => go("setup")}>
        ← Back
      </button>
      <div className="reading-head">
        <StepBar step={2} />
        <h1>Snap your meter</h1>
        <p className="subtle">We'll calculate exactly how many units you've used.</p>
      </div>
      <div className="reading-grid">
        <button className="meter-upload" onClick={() => setDone(true)}>
          {done ? <Unity mood="thinking" size={100} /> : <span className="camera-icon">◉</span>}
          <h3>{done ? "Meter read!" : "Upload or take a photo of your meter"}</h3>
          <p>Make sure digits are clear and well lit.</p>
          {!done && <em>Choose photo</em>}
        </button>
        <Card className="reading-result">
          <div className="result-title">
            <span>Detected reading</span>
            <AIBadge />
          </div>
          <div className="big-reading">
            {done ? "51306" : "— — — — —"} <button>Edit</button>
          </div>
          <div className="calculation">
            <span>51,306</span>
            <b>−</b>
            <span>50,875</span>
            <b>=</b>
            <strong>431 units</strong>
          </div>
          <Button variant="lime" onClick={() => go("dashboard")} className="full-button">
            Calculate My Bill →
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Shell({ page, go, children }: { page: Page; go: (p: Page) => void; children: ReactNode }) {
  const titles: Record<string, string> = {
    dashboard: "Your energy at a glance",
    bill: "Bill breakdown",
    appliances: "My appliances",
    history: "Usage history",
    settings: "Settings",
    reading: "New reading",
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand brand-light" onClick={() => go("landing")}>
          <span className="brand-bolt">ϟ</span>
          <span>UnitSaver</span>
        </button>
        <nav>
          {nav.map((item) => (
            <button
              key={item.page}
              className={page === item.page ? "active" : ""}
              onClick={() => go(item.page)}
            >
              <i>{item.icon}</i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-tip">
          <Unity size={52} />
          <span>
            <b>142 units</b>
            <small>You're doing great!</small>
          </span>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div>
            <p>Good Morning, Ali</p>
            <h1>{titles[page]}</h1>
          </div>
          <div className="top-actions">
            {page === "dashboard" && <Button onClick={() => go("reading")}>＋ New Reading</Button>}
            <button className="circle-button">
              ♢<i />
            </button>
            <div className="avatar">AK</div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
      <nav className="bottom-nav">
        {nav.slice(0, 5).map((item) => (
          <button
            key={item.page}
            className={page === item.page ? "active" : ""}
            onClick={() => go(item.page)}
          >
            <i>{item.icon}</i>
            <span>{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>
      {page === "dashboard" && (
        <button className="mobile-fab" onClick={() => go("reading")}>
          ▣
        </button>
      )}
    </div>
  );
}

function Gauge() {
  return (
    <div className="gauge">
      <svg viewBox="0 0 220 125">
        <path
          d="M25 110a85 85 0 0 1 170 0"
          fill="none"
          stroke={C.pale}
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d="M25 110a85 85 0 0 1 151-53"
          fill="none"
          stroke={C.blue}
          strokeWidth="28"
          strokeLinecap="round"
        />
      </svg>
      <div>
        <b>
          142 <small>/ 200</small>
        </b>
        <span>units</span>
      </div>
    </div>
  );
}

function AlertModal({ close }: { close: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="alert-modal">
        <button className="modal-close" onClick={close}>
          ×
        </button>
        <div className="alert-mascot">
          <Unity mood="worried" size={110} />
        </div>
        <div>
          <h1>SLOW DOWN!</h1>
          <p>
            You've used <b>178 units.</b> At this pace you'll reach 214 units and lose protected
            status for 6 months.
          </p>
          <span className="danger-chip">Save up to Rs 6,000/month</span>
          <div className="tip-box">
            <div>
              <i>↓</i>
              <span>
                Use <b>1.5 fewer units</b> per day
              </span>
            </div>
            <div>
              <i>⌁</i>
              <span>Your AC uses the most — cut 1 hour daily</span>
            </div>
          </div>
          <div className="modal-actions">
            <Button onClick={close}>Got it</Button>
            <Button variant="white">See my appliances</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [alert, setAlert] = useState(false);
  return (
    <>
      <div className="dashboard-grid">
        <Card className="units-card">
          <div className="card-kicker">
            Units this month <span>Live</span>
          </div>
          <Gauge />
          <p>9 days left in billing cycle</p>
          <div className="peek">
            <Unity size={92} />
          </div>
        </Card>
        <Card className="protected-card">
          <div className="shield">✓</div>
          <p>Status</p>
          <h2>PROTECTED</h2>
          <span>6 of 6 months under 200 units</span>
        </Card>
        <Card className="bill-card">
          <div className="result-title">
            <p>Estimated Bill</p>
            <AIBadge />
          </div>
          <h2>Rs 3,250</h2>
          <button>View breakdown →</button>
          <div className="half-moon" />
        </Card>
        <Card className="prediction-card">
          <p>Month-end prediction</p>
          <h2>186 units</h2>
          <hr />
          <p>Daily budget</p>
          <strong>6.4 units/day</strong>
          <Unity size={55} />
        </Card>
        <Card className="co2-card">
          <div className="leaf">♧</div>
          <p>Positive impact</p>
          <h2>18 kg CO₂ saved</h2>
          <span>this month · ≈ planting 1 tree</span>
        </Card>
        <Card className="tips-card">
          <div className="result-title">
            <h2>Tips for you</h2>
            <AIBadge />
          </div>
          {[
            "Reduce AC use by 1 hour/day to save 1.5 units",
            "Run the iron once instead of in small batches",
            "Your fridge is most efficient at 3–4°C",
          ].map((x, i) => (
            <div className="tip-row" key={x}>
              <i>{["⌁", "≈", "□"][i]}</i>
              <span>{x}</span>
              <b>→</b>
            </div>
          ))}
        </Card>
      </div>
      <button className="alert-preview" onClick={() => setAlert(true)}>
        Preview near-200 alert
      </button>
      {alert && <AlertModal close={() => setAlert(false)} />}
    </>
  );
}

const charges = [
  {
    title: "IESCO Charges",
    color: C.pale,
    total: "Rs 18,742",
    rows: [
      ["Cost of electricity", "Rs 16,770"],
      ["Fixed charges", "Rs 800"],
      ["F.C. surcharge", "Rs 186"],
      ["Quarterly adjustment", "Rs 986"],
    ],
  },
  {
    title: "Government Taxes",
    color: C.pink,
    total: "Rs 4,598",
    rows: [
      ["Electricity duty", "Rs 252"],
      ["GST", "Rs 3,594"],
      ["TV fee", "Rs 35"],
      ["Income tax", "Rs 717"],
    ],
  },
  {
    title: "Fuel Price Adjustment",
    color: C.mint,
    total: "Rs 1,066",
    rows: [
      ["FPA amount", "Rs 904"],
      ["Taxes on FPA", "Rs 162"],
    ],
  },
];

function BillBreakdown() {
  return (
    <>
      <div className="summary-chips">
        <span>431 units</span>
        <span className="danger">Non-protected</span>
        <span>Normal meter</span>
      </div>
      <Card className="total-card">
        <div>
          <p>Payable within due date</p>
          <h2>Rs 24,406</h2>
        </div>
        <div>
          <span>After due date</span>
          <b>Rs 26,350</b>
        </div>
        <em>Estimated</em>
      </Card>
      <div className="breakdown-grid">
        {charges.map((c) => (
          <Card key={c.title} style={{ background: c.color }} className="charge-card">
            <div className="charge-title">
              <h3>{c.title}</h3>
              <b>{c.total}</b>
            </div>
            {c.rows.map((r) => (
              <div className="charge-row" key={r[0]}>
                <span>{r[0]}</span>
                <b>{r[1]}</b>
              </div>
            ))}
            <button>View details ↓</button>
          </Card>
        ))}
      </div>
      <div className="calculation-note">
        <b>i</b>
        <span>Rate Rs 38.91 × 431 units</span>
      </div>
      <p className="legal-note">Estimate based on current NEPRA tariffs. Actual bill may vary.</p>
    </>
  );
}

const appliances = [
  ["AC 1.5 Ton", "1500W", "270 units/month", C.blue, "▭"],
  ["Water Motor", "750W", "22 units/month", C.lime, "◉"],
  ["Iron", "1000W", "12 units/month", C.pink, "▱"],
  ["Fridge", "180W", "8 units/month", C.pale, "▯"],
];

function Appliances() {
  const [modal, setModal] = useState(false);
  return (
    <>
      <div className="page-action">
        <p>See which appliances use the most energy.</p>
        <Button variant="lime" onClick={() => setModal(true)}>
          ＋ Add Appliance
        </Button>
      </div>
      <Card className="appliance-summary">
        <div>
          <p>Estimated monthly units</p>
          <h2>
            312 <small>units</small>
          </h2>
        </div>
        <div>
          <p>Estimated bill incl. taxes</p>
          <strong>Rs 15,800</strong>
        </div>
        <div className="donut" />
        <div className="legend">
          <span>● AC 86%</span>
          <span>● Motor 7%</span>
          <span>● Other 7%</span>
        </div>
      </Card>
      <div className="appliance-grid">
        {appliances.map((a, i) => (
          <Card
            key={a[0]}
            className={i === 0 ? "dark-card appliance-card" : "appliance-card"}
            style={{ background: a[3] }}
          >
            <div className="appliance-top">
              <i>{a[4]}</i>
              <span>
                <button>✎</button>
                <button>×</button>
              </span>
            </div>
            <h3>
              {a[0]} · {a[1]}
            </h3>
            <strong>{a[2]}</strong>
            <label>
              Hours per day <b>{i === 0 ? "6h" : "1h"}</b>
              <input type="range" defaultValue={i === 0 ? 60 : 20} />
            </label>
          </Card>
        ))}
      </div>
      <div className="tip-banner">
        ♧ <b>Cut AC by 2 hrs/day</b> to get under 200 units. <button>See how →</button>
      </div>
      {modal && (
        <div className="modal-overlay">
          <div className="add-modal">
            <button className="modal-close" onClick={() => setModal(false)}>
              ×
            </button>
            <h2>Add an appliance</h2>
            <p>We'll estimate its monthly energy use.</p>
            <label>
              Appliance
              <select>
                <option>Air Conditioner</option>
                <option>Fridge</option>
                <option>Water Motor</option>
              </select>
            </label>
            <div className="form-grid">
              <label>
                Watts
                <input defaultValue="1500" />
              </label>
              <label>
                Quantity
                <input defaultValue="1" />
              </label>
              <label className="full">
                Hours per day
                <input defaultValue="6" />
              </label>
            </div>
            <Button className="full-button" onClick={() => setModal(false)}>
              Add Appliance
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function History() {
  const values = [164, 188, 224, 176, 192, 246, 431, 198, 186, 154, 172, 142];
  return (
    <>
      <div className="history-toolbar">
        <div className="segmented compact">
          <button className="selected">Units</button>
          <button>Rupees</button>
        </div>
        <select>
          <option>Last 12 months</option>
        </select>
      </div>
      <Card className="chart-card">
        <div className="chart-head">
          <div>
            <p>Electricity usage</p>
            <h2>
              2,473 units <small>this year</small>
            </h2>
          </div>
          <span>↓ 12% vs last year</span>
        </div>
        <div className="bar-chart">
          <i className="limit">200 unit limit</i>
          {values.map((v, i) => (
            <div key={i}>
              <b style={{ height: `${v / 2.5}px`, background: v > 200 ? C.pink : C.lime }} />
              <span>
                {
                  [
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                  ][i]
                }
              </span>
            </div>
          ))}
        </div>
      </Card>
      <div className="insight-grid">
        <Card style={{ background: C.pale }}>
          <span>↗</span>
          <b>July was your highest month</b>
          <p>431 units</p>
        </Card>
        <Card style={{ background: C.mint }}>
          <span>♧</span>
          <b>Total CO₂ saved</b>
          <p>64 kg</p>
        </Card>
        <Card style={{ background: C.pink }}>
          <span>!</span>
          <b>April crossed the limit</b>
          <p>by only 24 units</p>
        </Card>
      </div>
      <Card className="readings-table">
        <div className="table-head">
          <h2>Meter readings</h2>
          <button>Download CSV ↓</button>
        </div>
        {[
          ["22 Jul 2025", "51,306", "431", "Rs 24,406"],
          ["21 Jun 2025", "50,875", "191", "Rs 4,880"],
          ["22 May 2025", "50,684", "164", "Rs 3,760"],
          ["21 Apr 2025", "50,520", "224", "Rs 7,920"],
        ].map((r) => (
          <div className="table-row" key={r[0]}>
            {r.map((x, i) => (
              <span key={x} data-label={["Date", "Reading", "Units", "Est. bill"][i]}>
                {x}
              </span>
            ))}
          </div>
        ))}
      </Card>
    </>
  );
}

function Settings() {
  const items = [
    ["Electricity company", "IESCO"],
    ["Meter type", "Normal"],
    ["Billing cycle date", "22nd of every month"],
    ["Tax filer status", "Filer"],
    ["Alert threshold", "170 units"],
  ];
  return (
    <>
      <Card className="profile-banner">
        <div className="profile-photo">AK</div>
        <div>
          <h2>Ali Khan</h2>
          <p>ali.khan@email.com</p>
          <b>IESCO customer</b>
        </div>
        <button>Edit profile</button>
      </Card>
      <Card className="settings-list">
        <h2>Bill preferences</h2>
        {items.map((x) => (
          <button className="setting-row" key={x[0]}>
            <span>
              <b>{x[0]}</b>
              <small>{x[1]}</small>
            </span>
            <i>›</i>
          </button>
        ))}
      </Card>
      <Card className="settings-list">
        <h2>Notifications</h2>
        <div className="setting-row">
          <span>
            <b>Usage alerts</b>
            <small>Get notified near your limit</small>
          </span>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <i />
          </label>
        </div>
        <div className="setting-row">
          <span>
            <b>Weekly summary</b>
            <small>Your weekly use and savings</small>
          </span>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <i />
          </label>
        </div>
      </Card>
      <button className="logout">Log out</button>
    </>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const go = (next: Page) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  if (page === "landing") return <Landing go={go} />;
  if (page === "setup") return <Setup go={go} />;
  if (page === "reading") return <Reading go={go} />;
  return (
    <Shell page={page} go={go}>
      {page === "dashboard" && <Dashboard />}
      {page === "bill" && <BillBreakdown />}
      {page === "appliances" && <Appliances />}
      {page === "history" && <History />}
      {page === "settings" && <Settings />}
    </Shell>
  );
}
