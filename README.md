# UnitSaver ϟ

**An AI energy coach for Pakistani homes.** Snap your meter, see your units and your full estimated bill before it arrives, and stay under the 200-unit "protected" slab.

Built for **Build with Google Hackathon – GDGoC CUI, CUI Tech Fest FA'26** · Domain: Climate, Water & Environmental Sustainability.

---

## The problem

In Pakistan, a household that stays at or below **200 units every month for 6 months** is "protected" and pays far lower rates. Cross 200 once, even by a single unit, and the household:

- pays the much higher non-protected rate on **every** unit that month (431 units at Rs 38.91 instead of slab rates), and
- loses protection for the **next 6 months**.

Most families only find out when the bill arrives. Bills are also hard to read: energy charges, fixed charges, FC surcharge, QTR, electricity duty, GST, TV fee and a fuel price adjustment based on an *earlier* month's units.

## The solution

1. **Add last month's bill:** upload a photo. Gemini reads the readings, reading date, meter type and 12-month history. You can also type them in.
2. **Snap your meter:** Gemini reads the digits, and UnitSaver calculates the units used so far this cycle.
3. **Dashboard:** units gauge (x / 200), protected status with a 6-month countdown, an estimated bill at your current pace, a month-end forecast, a daily unit budget, CO₂ saved and AI tips.
4. **Near-200 alert:** warns you while there is still time to act and tells you what a cut saves. Peak-hour advice appears only for TOU meters.
5. **Bill breakdown:** every line of an IESCO bill, computed in deterministic TypeScript and tested against a real bill.
6. **Appliances:** watts × hours × 30 → monthly units → bill, a "who uses the most" donut, and "cut X hours to get under 200".
7. **History:** 12-month chart (months over 200 in pink, units or rupees), insights, readings and a CSV export.

## SDGs

| SDG | How UnitSaver helps |
|---|---|
| **13 Climate Action** (primary) | Every unit saved avoids ~0.5 kg CO₂ on Pakistan's fossil-heavy grid. The app shows the CO₂ you avoided. |
| **12 Responsible Consumption** | It makes consumption visible during the month, not after the bill, and gives specific, appliance-level actions. |
| **7 Affordable & Clean Energy** | It keeps households in the protected slab, so electricity stays affordable. |

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS v4 + design CSS ported from the Figma Make export |
| AI | Google Gemini via `@google/genai`, with structured JSON output validated by zod |
| Auth | Firebase Authentication: anonymous sign-in, no sign-up screens |
| Database | Cloud Firestore (client SDK), with a per-user security rule |
| Charts | Recharts |
| Tests | Vitest |
| Package manager | pnpm |

### AI models and services used

| Where | Model / service | What it does |
|---|---|---|
| `/api/read-bill` | Gemini Flash (`GEMINI_MODEL`, default `gemini-flash-latest`) | Reads a bill photo or PDF into structured JSON (no names, addresses, CNIC or reference numbers). |
| `/api/read-meter` | Gemini Flash | Reads the kWh digits from a meter photo, with a confidence level. |
| `/api/tips` | Gemini Flash | Writes 3 short, personalised saving tips. |
| Auth / DB | Firebase Anonymous Auth, Cloud Firestore | Per-device anonymous account and data. |

**The AI never does billing math.** All bills, the protected status, predictions and CO₂ come from pure TypeScript in `src/lib/billing`, with unit tests.

## Responsible AI and privacy

- Every AI-read value shows an **AI** badge and can be edited before it is saved. Every bill is labelled **Estimated**.
- Low-confidence reads show a warning. Failed reads show "couldn't read clearly – try again or enter manually" and fall back to manual entry.
- If Gemini is unavailable, tips fall back to rule-based tips, so the demo never breaks.
- Photos are sent to Gemini once and **never stored**. The bill prompt forbids extracting personal identifiers.
- The Gemini key is server-only (`import "server-only"`) and is never sent to the browser.
- Disclaimer on every bill view: *"Estimate based on current NEPRA tariffs. Actual bill may vary."*

## Setup

Requirements: Node 20+, pnpm (`npm i -g pnpm`).

```bash
pnpm install
cp .env.example .env.local   # then fill it in (see below)
pnpm dev                     # http://localhost:3000
```

### Environment variables (`.env.local`)

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey). Server-only. |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-flash-latest`. |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase console → Project settings → Your apps → Web app config. |

Firebase console steps:

1. **Authentication → Sign-in method → Anonymous → Enable.**
2. **Firestore Database → Create database.**
3. Deploy the rules in `firestore.rules` (each user can only read and write `users/{their uid}`): `firebase deploy --only firestore:rules`, or paste them into the console.

**No keys? It still works.**
- Without Firebase vars, data is saved in the browser (localStorage). The Settings page shows "Saved on this device only".
- Without a Gemini key, photo reading returns a friendly error and offers manual entry, and tips use the rule-based fallback.
- Use **Load demo data** (on the dashboard empty state, the setup page, or Settings) to see everything without any photos.

### Scripts

```bash
pnpm dev         # dev server
pnpm test        # Vitest (incl. the reference IESCO bill test)
pnpm typecheck   # tsc --noEmit
pnpm lint        # ESLint
pnpm build       # production build
```

### Deploy

Firebase App Hosting: connect the repo, set the env vars as secrets (`GEMINI_API_KEY`) and plain variables (`NEXT_PUBLIC_*`). Vercel works as a backup with the same env vars.

## How the numbers are calculated

All rates live in `src/config/tariffs.json`. No rate is hard-coded in the logic.

```
energy      = protected ? Σ(slab units × slab rate) : units × rate of the slab the total falls in
base        = energy + fixed + FC surcharge × units + QTR × units
ED          = 1.5% × (energy + QTR)
GST         = 18% × (base + ED)
currentBill = round(base + ED + GST + TV fee [+ non-filer income tax])
FPA total   = round(FPA rate × units of 2 months earlier, + ED + GST on it)
payable     = currentBill + FPA total (+ arrears)
late        = payable + 10% × base
```

**Protected:** all of the last 6 completed months ≤ 200. **Countdown:** 6 − consecutive months ≤ 200 since the last month over 200.
**Prediction:** `units so far + (units so far / days elapsed) × days left`. **Daily budget:** `(200 − units so far) / days left`.

**Reference test:** a real IESCO bill from July 2024, with 431 units, non-protected, and FPA on 279 units. The test reproduces every line within ±1 rupee: payable **Rs 24,406**, after due date **Rs 26,350** (`src/lib/billing/__tests__/billing.test.ts`).

**CO₂:** `units saved × 0.5 kg/kWh`. Units saved = same month last year (or last month) − this month's forecast, minimum 0. The 0.5 factor is the mid-range of published Pakistan grid estimates (≈0.48–0.57 kg CO₂/kWh from CDM baseline studies; see the [Energy & Clean Air analysis of Pakistan's power sector](https://energyandcleanair.org/wp/wp-content/uploads/2021/07/CO2-Emissions-from-Pakistans-Energy-sector_30_07_2021.pdf) and [Pakistan's First Biennial Update Report to the UNFCCC](https://unfccc.int/sites/default/files/resource/Pakistan%E2%80%99s%20First%20Biennial%20Update%20Report%20%28BUR-1%29%20-%202022.pdf)). Verify it before production use.

## Project structure

```
src/
  app/
    page.tsx                 Landing
    setup/ reading/          Onboarding steps 1 & 2
    (app)/                   Pages inside the app shell: dashboard, bill, appliances, history, settings
    api/read-bill|read-meter|tips/route.ts   Gemini route handlers (server-only)
  components/                Ported UI (mascot, gauge, cards, shell, alert modal, tips)
  lib/
    billing/                 calculateBill, protectedStatus, prediction, co2, appliances, summary + tests
    gemini.ts                Server-only Gemini client (zod → responseJsonSchema)
    firebase.ts, db.ts       Anonymous auth + Firestore (localStorage fallback)
    schemas.ts, demo.ts, tips.ts, dates.ts, image.ts
  config/tariffs.json        All rates
firestore.rules              Per-user security rules
```

`Design-UnitSaver-Energy-Tracker/` is the Figma Make export. It is a visual reference only and is excluded from TypeScript, ESLint and the build.

## Limitations (prototype)

- **Tariffs must be verified.** The 401–500 slab, the fixed charge, FC, QTR and FPA rates come from one real July 2024 bill. The other slab rates, protected rates, fixed charges for other slabs, and the income-tax rule are best-known values. `tariffs.json` is marked `"verified": false`.
- FPA and QTR change often. The estimate uses one stored rate, and FPA uses the units from two months earlier.
- Only residential A-1 (normal meter) billing is modelled. TOU meters are tracked for tips, but peak and off-peak registers are not billed separately.
- The billing cycle is modelled as one month from the last bill's reading date. Starting a new cycle means updating the last bill (Settings → Update last bill).
- The non-protected rule follows the reference bill: all units at the slab rate, with no "previous slab benefit".
- Anonymous accounts are per device and browser. Clearing site data loses the account.
- AI reading quality depends on the photo. Every value is shown for review.

## Future work

Load-shedding planner, AI chat assistant, Urdu/RTL, fetching bills from the PITC portal, smart-plug integration, solar calculator.
