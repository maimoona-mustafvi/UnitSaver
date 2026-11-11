# UnitSaver – Project Reference

> Read this file fully before writing any code. It is the single source of truth for scope, stack, architecture, business logic, and design. If something here conflicts with the Figma export, this file wins for logic; the Figma export wins for visuals.

---

## 1. Overview

**UnitSaver** is an AI-powered, responsive web app that helps Pakistani households:
- calculate electricity units consumed from meter readings,
- estimate their bill with all charges and taxes,
- stay under the 200-unit "protected" slab,
- reduce consumption and CO2 emissions.

**Context:** Build with Google Hackathon (GDGoC CUI, CUI Tech Fest FA'26).
- Domain: Climate, Water & Environmental Sustainability (sustainable resource management).
- SDGs: 13 Climate Action (primary), 12 Responsible Consumption, 7 Affordable & Clean Energy.
- Judging weights: Implementation completeness 30, Problem/SDG 20, Innovation 20, Google tech 10, UX 10, Presentation 10.
- Development time is short (~4.5 hours). **A working end-to-end demo beats many half-done features.**

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS (port tokens and styles from the Figma export) |
| UI components | Port components from the Figma export; shadcn/ui-style primitives allowed |
| AI | Google Gemini API via `@google/genai` (latest Flash model, configurable via env) |
| Auth | Firebase Auth – anonymous sign-in (no signup screens) |
| Database | Firebase Firestore (client SDK) |
| Charts | Recharts |
| Hosting | Firebase App Hosting (Vercel as backup) |
| Package manager | pnpm |

**Rules**
- The Gemini API key is used **only on the server** (Next.js Route Handlers). Never expose it to the client.
- No other paid services.

---

## 3. Repository Layout

```
UnitSaver/
├── PROJECT.md                     ← this file
├── Design-UnitSaver-Energy-Trac…/ ← Figma Make export (Vite + React). REFERENCE ONLY.
│                                    Do not run, modify, or deploy it. Port its UI into the Next.js app.
├── src/
│   ├── app/
│   │   ├── page.tsx                    Landing page
│   │   ├── setup/page.tsx              Step 1: add last month's bill
│   │   ├── reading/page.tsx            Step 2: snap meter / new reading
│   │   ├── dashboard/page.tsx
│   │   ├── bill/page.tsx               Bill breakdown
│   │   ├── appliances/page.tsx
│   │   ├── history/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── read-bill/route.ts      Gemini: extract data from bill photo
│   │       ├── read-meter/route.ts     Gemini: read meter digits
│   │       └── tips/route.ts           Gemini: personalized saving tips
│   ├── components/                     Ported UI components (cards, gauge, nav, modals…)
│   ├── lib/
│   │   ├── billing/
│   │   │   ├── calculateBill.ts        Pure function – bill engine
│   │   │   ├── protectedStatus.ts      Pure function – status + countdown
│   │   │   ├── prediction.ts           Month-end forecast + daily budget
│   │   │   ├── appliances.ts           Appliance unit estimation
│   │   │   ├── co2.ts                  CO2 saved
│   │   │   └── __tests__/              Unit tests (must include the reference bill test)
│   │   ├── gemini.ts                   Server-only Gemini client
│   │   ├── firebase.ts                 Client Firebase init
│   │   └── db.ts                       Firestore read/write helpers
│   ├── config/
│   │   └── tariffs.json                All rates – NEVER hard-code rates in logic
│   └── types/index.ts
├── .env.local                          (not committed)
└── README.md
```

Exclude the Figma export folder from `tsconfig.json` (`"exclude"`) and from ESLint so it does not break the Next.js build.

---

## 4. Features (agreed scope)

### Must have (build in this order)
1. **Setup – last month's bill**
   - Upload bill photo → Gemini extracts: bill month, previous & present meter readings, reading date, tariff, meter type (normal / TOU), 12-month units history.
   - OR enter manually: last meter reading, reading date, last 6 months' units.
   - Every AI-extracted field is shown for review and is editable.
2. **New reading – snap meter**
   - Upload/take meter photo (`<input type="file" accept="image/*" capture="environment">`) → Gemini reads digits → editable.
   - Units = current reading − last reading.
3. **Bill estimate** with full breakdown (IESCO charges, govt taxes, FPA, totals before/after due date). Labeled "Estimated".
4. **Protected status indicator + countdown** (see logic §6.2).
5. **Dashboard**: units gauge (x / 200), status card, estimated bill, month-end prediction + daily budget, CO2 saved, AI tips.
6. **Near-200 alert modal** with personalized tips (Gemini). Peak-hour tips **only** for TOU meters.

### Should have (if time)
7. **Appliance estimator**: appliances × watts × hours → monthly units → bill (incl. taxes); "who uses the most" donut.
8. **History**: 12-month bar chart (months > 200 highlighted), readings list.

### Nice to have
9. Settings page (company, meter type, billing cycle date, filer status, alert threshold).

### Out of scope (mention as future work only)
Load-shedding planner, AI chat assistant, Urdu/RTL, PITC portal fetching, smart plugs, solar calculator.

---

## 5. Architecture & Data Flow

```
[Bill photo] → /api/read-bill → Gemini (structured JSON) → review form → Firestore
[Meter photo] → /api/read-meter → Gemini → review → units
units + settings + history → lib/billing/* (pure TS) → dashboard / bill page
status + usage + appliances → /api/tips → Gemini → tips list
```

- All billing math is **deterministic TypeScript**, never done by the AI. AI only reads images and writes tips.
- Gemini calls use **structured output** (`responseMimeType: "application/json"` + `responseSchema`) and are validated (e.g. with zod) before use.
- If an AI call fails or confidence is low → show the error state and offer manual entry.

### Gemini response schemas

`/api/read-meter` → `{ reading: number | null, confidence: "high" | "medium" | "low", notes?: string }`

`/api/read-bill` →
```json
{
  "billMonth": "2024-07",
  "previousReading": 50875,
  "presentReading": 51306,
  "readingDate": "2024-07-19",
  "unitsBilled": 431,
  "tariff": "A-1(a)",
  "meterType": "normal",
  "history": [{ "month": "2024-06", "units": 424 }, "... up to 12 entries"],
  "confidence": "high"
}
```
Do **not** extract or store name, address, CNIC, or reference number.

`/api/tips` input: `{ unitsSoFar, daysLeft, predictedUnits, status, meterType, appliances[] }` → output `{ tips: string[] }` (3 short, specific, actionable tips; no peak-hour advice unless meterType = "tou").

### Firestore model (per anonymous user)
```
users/{uid}
  settings: { company, meterType, billingCycleDay, isFiler, alertThreshold }
  history: [{ month, units }]          // from bill or manual entry
  lastBill: { month, previousReading, presentReading, readingDate }
users/{uid}/readings/{id}: { reading, date, units, source: "ai" | "manual" }
users/{uid}/appliances/{id}: { name, watts, quantity, hoursPerDay }
```

### Environment variables
```
GEMINI_API_KEY=
GEMINI_MODEL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## 6. Business Logic

### 6.1 Bill calculation (derived from a real IESCO bill)

```
energy        = energyCharge(units, status)            // see slab rules below
fixed         = fixedCharge(units, status)              // from tariffs.json
fcSurcharge   = FC_rate  × units
qtr           = QTR_rate × units
base          = energy + fixed + fcSurcharge + qtr
ED            = ED_pct  × (energy + qtr)                // electricity duty, 1.5%
GST           = GST_pct × (base + ED)                   // 18%
currentBill   = base + ED + GST + TV_fee (+ incomeTax if applicable)
fpa           = FPA_rate × fpaReferenceUnits            // FPA uses an EARLIER month's units
fpaTotal      = fpa + ED_pct × fpa + GST_pct × (fpa + ED_pct × fpa)
payable       = round(currentBill + fpaTotal + arrears)
latePayable   = payable + LPS_pct × base                // 10%
```

**Slab rules**
- **Protected**: progressive – each slab's units at that slab's rate.
- **Non-protected**: find the slab the total units fall into and charge **all units at that slab's rate** (the reference bill charges 431 × 38.912).
- Income tax: apply only if configured (non-filer and bill above threshold); default 0.

### 6.2 Protected status
- Use the last 6 completed months (from history).
- **Protected** if every one of the last 6 months ≤ 200 units; otherwise **non-protected**.
- **Countdown** (non-protected): `monthsRemaining = 6 − (consecutive months ≤ 200 since the most recent month > 200)`.
- Warn that the countdown resets if the user crosses 200 again.

### 6.3 Prediction & daily budget
- `dailyAvg = unitsSoFar / daysElapsed`
- `predictedUnits = unitsSoFar + dailyAvg × daysLeft`
- `dailyBudget = (200 − unitsSoFar) / daysLeft` (only meaningful while unitsSoFar < 200)
- Alert when `unitsSoFar ≥ alertThreshold` (default 170) or `predictedUnits > 200`.

### 6.4 Appliances
`monthlyUnits = watts × quantity × hoursPerDay × 30 / 1000`, then run the total through `calculateBill`.

### 6.5 CO2
`co2Kg = unitsSaved × GRID_EMISSION_FACTOR` (kg CO2 per kWh, in tariffs.json; verify the current Pakistan grid factor and cite the source in README). `unitsSaved` = previous comparable month − current (min 0), or units below the predicted baseline.

### 6.6 `src/config/tariffs.json` (shape)
```json
{
  "source": "Fill from latest NEPRA notification – values below marked TODO must be verified",
  "protected": {
    "slabs": [
      { "upTo": 100, "rate": "TODO" },
      { "upTo": 200, "rate": "TODO" }
    ],
    "fixedCharges": [{ "upTo": 100, "amount": "TODO" }, { "upTo": 200, "amount": "TODO" }]
  },
  "nonProtected": {
    "slabs": [
      { "upTo": 100, "rate": "TODO" },
      { "upTo": 200, "rate": "TODO" },
      { "upTo": 300, "rate": "TODO" },
      { "upTo": 400, "rate": "TODO" },
      { "upTo": 500, "rate": 38.912 },
      { "upTo": 600, "rate": "TODO" },
      { "upTo": 700, "rate": "TODO" },
      { "upTo": null, "rate": "TODO" }
    ],
    "fixedCharges": [{ "upTo": 500, "amount": 240 }]
  },
  "fcSurchargePerUnit": 3.23,
  "qtrPerUnit": 2.4154,
  "fpaPerUnit": 3.3287,
  "edPct": 0.015,
  "gstPct": 0.18,
  "tvFee": 35,
  "lpsPct": 0.10,
  "gridEmissionFactor": "TODO"
}
```
Use numeric values in the real file; until verified, use the reference-bill values so the test passes.

### 6.7 Reference test (must pass)
Real IESCO bill, July 2024, non-protected, normal meter:

| Input | Value |
|---|---|
| Units | 431 (51306 − 50875) |
| Rate | 38.912 |
| Fixed charges | 240 |
| FC surcharge | 3.23 / unit |
| QTR | 1041.04 total |
| FPA | 279 reference units × 3.3287 |

| Expected | Value |
|---|---|
| Cost of electricity | 16,771 |
| Base subtotal | 19,444.17 |
| Electricity duty | 267 |
| GST | 3,548 |
| TV fee | 35 |
| Current bill | 23,294 |
| FPA incl. taxes | ≈ 1,112 |
| Payable within due date | 24,406 |
| Late payment surcharge | 1,944 |
| Payable after due date | 26,350 |

History for the status test (oldest → newest): Jul-23 408, Aug 404, Sep 420, Oct 265, Nov 148, Dec 148, Jan 148, Feb 160, Mar 157, Apr 224, May 279, Jun 424 → **non-protected**; the user was one month from regaining protection before April.

Allow ±1 rupee tolerance for rounding.

---

## 7. Design System

Port visuals from the Figma export. Tokens:

| Token | Hex | Use |
|---|---|---|
| royal | #213F99 | Primary, sidebar, dark cards |
| lime | #D4EE5E | CTAs, headlines on blue, gauge card |
| paleLime | #E4F5A1 | Light cards, inputs, chips |
| pink | #F38FD8 | Warnings, bill card |
| magenta | #E544B5 | Danger, non-protected |
| mint | #B7EED8 | Success, tips, AI badge, protected |
| white | #FFFFFF | Page background |
| ink | #111111 | Text, outlines |
| softGrey | #EDEDED | Dividers, inactive |

- **No purple/lavender anywhere.**
- Fonts: playful display font for headlines (match the export), Poppins for body.
- Cards: 28px radius, flat. Buttons fully rounded.
- Responsive: desktop sidebar (1440), tablet collapsible sidebar (768), mobile bottom nav (375).
- Show an "AI" badge on AI-extracted/generated values; label bills "Estimated".
- Every AI screen has loading, error ("couldn't read clearly – try again or enter manually"), and edit states.

---

## 8. Responsible AI & Privacy
- AI output is never presented as verified fact: always editable, always labeled.
- Do not store personal identifiers from bills; discard images after extraction (don't upload them to storage).
- Show the disclaimer: "Estimate based on current NEPRA tariffs. Actual bill may vary."
- README must list AI models/services used and prototype limitations.

---

## 9. Conventions
- TypeScript strict; small, typed, pure functions in `lib/billing` with unit tests (Vitest).
- Server-only code (`lib/gemini.ts`, route handlers) must never be imported by client components.
- Keep components presentational; data access through `lib/db.ts`.
- Commit after each working feature with clear messages.
- Keep a demo-safe fallback: if Gemini is unavailable, allow manual entry and use sample data.

---

## 10. Build Plan
1. Scaffold Next.js + Tailwind + tokens; port layout (sidebar, top bar, bottom nav) and landing page.
2. Billing engine + tariffs.json + reference test passing.
3. Gemini route handlers (meter, bill) with schemas + review/edit UI.
4. Setup → reading → dashboard flow with Firestore (anonymous auth).
5. Bill breakdown page, protected status card + countdown, alert modal + tips.
6. Appliances, history, settings (if time).
7. Deploy, README, polish, demo data.
