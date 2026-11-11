"use client";

import { useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { useData } from "@/components/DataProvider";
import { PeriodEstimate } from "@/components/PeriodEstimate";
import { SetupPrompt } from "@/components/SetupPrompt";
import { Button, C, Card, Loading, Notice, num, rs } from "@/components/ui";
import { applianceTotals, billStatus, calculateBill, hoursToCut } from "@/lib/billing";
import type { NewAppliance } from "@/lib/db";
import type { Appliance } from "@/types";

type Preset = { name: string; watts: number; hoursPerDay: number; quantity?: number; daysPerWeek?: number };
const PRESETS: Preset[] = [
  { name: "Fridge", watts: 150, hoursPerDay: 24 },
  { name: "LED Bulb", watts: 12, hoursPerDay: 7, quantity: 4 },
  { name: "Water Motor", watts: 750, hoursPerDay: 0.5 },
  { name: "Iron", watts: 1000, hoursPerDay: 1, daysPerWeek: 1 },
  { name: "Ceiling Fan", watts: 75, hoursPerDay: 12 },
  { name: "AC 1.5 Ton", watts: 1500, hoursPerDay: 6 },
  { name: "Inverter AC 1.5 Ton", watts: 1000, hoursPerDay: 6 },
  { name: "Washing Machine", watts: 500, hoursPerDay: 1, daysPerWeek: 2 },
  { name: "Television", watts: 100, hoursPerDay: 5 },
  { name: "Microwave", watts: 1200, hoursPerDay: 0.25 },
  { name: "Computer / Laptop", watts: 150, hoursPerDay: 4 },
  { name: "Electric Geyser", watts: 2000, hoursPerDay: 1 },
];

const ICONS: [RegExp, string][] = [
  [/ac|air/i, "▭"],
  [/fan/i, "✣"],
  [/fridge|freezer/i, "▯"],
  [/motor|pump/i, "◉"],
  [/iron/i, "▱"],
  [/bulb|light|led/i, "☀"],
  [/tv|television/i, "▣"],
];
const icon = (name: string) => ICONS.find(([re]) => re.test(name))?.[1] ?? "⌁";
const CARD_COLORS = [C.blue, C.lime, C.pink, C.pale, C.mint];
const SLICE_COLORS = [C.lime, C.pink, C.mint, C.pale, "#ffffff"];

type Draft = { id?: string; name: string; watts: string; quantity: string; hoursPerDay: string; daysPerWeek: string };
const presetDraft = (p: Preset) => ({
  name: p.name,
  watts: String(p.watts),
  quantity: String(p.quantity ?? 1),
  hoursPerDay: String(p.hoursPerDay),
  daysPerWeek: String(p.daysPerWeek ?? 7),
});
const emptyDraft = (): Draft => presetDraft(PRESETS[0]);
const often = (days = 7) => (days >= 7 ? "daily" : `${days} day${days === 1 ? "" : "s"}/week`);

function parseDraft(d: Draft): NewAppliance | string {
  const watts = Number(d.watts), quantity = Number(d.quantity), hoursPerDay = Number(d.hoursPerDay), daysPerWeek = Number(d.daysPerWeek);
  if (!d.name.trim()) return "Give the appliance a name.";
  if (!(watts > 0 && watts <= 10000)) return "Watts must be between 1 and 10,000.";
  if (!(Number.isInteger(quantity) && quantity >= 1 && quantity <= 50)) return "Quantity must be a whole number from 1 to 50.";
  if (!(hoursPerDay >= 0 && hoursPerDay <= 24)) return "Hours per day must be between 0 and 24 (use 0.5 for 30 minutes).";
  if (!(Number.isInteger(daysPerWeek) && daysPerWeek >= 1 && daysPerWeek <= 7)) return "Days per week must be a whole number from 1 to 7.";
  return { id: d.id, name: d.name.trim().slice(0, 60), watts, quantity, hoursPerDay, daysPerWeek };
}

const toAppliance = ({ id, name, watts, quantity, hoursPerDay, daysPerWeek }: Appliance): Appliance =>
  ({ id, name, watts, quantity, hoursPerDay, ...(daysPerWeek !== undefined && { daysPerWeek }) });

export default function AppliancesPage() {
  const { loading, data, run, summary } = useData();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [hours, setHours] = useState<Record<string, number>>({});
  if (loading) return <Loading />;
  if (!data) return <SetupPrompt />;

  // Slider values show instantly; they are saved when the user lets go.
  const list = data.appliances.map((a) => ({ ...a, hoursPerDay: hours[a.id] ?? a.hoursPerDay }));
  const { rows, total } = applianceTotals(list);
  // Same FPA reference month as the metered estimate, so this matches the "Whole month" figure below.
  const bill = calculateBill({
    units: total,
    status: billStatus(data.history, total),
    fpaReferenceUnits: summary?.estimate.fpaReferenceUnits ?? total,
    isFiler: data.settings.isFiler,
  });
  const cut = hoursToCut(list);
  const top = rows.slice(0, 3);
  const otherShare = rows.slice(3).reduce((s, r) => s + r.share, 0);
  const slices = [...top.map((r) => ({ name: r.name, value: r.units })), ...(otherShare ? [{ name: "Other", value: otherShare * total }] : [])];

  const save = (a: NewAppliance) => run((s) => s.saveAppliance(a));
  async function commitHours(a: Appliance) {
    const h = hours[a.id];
    const saved = data!.appliances.find((x) => x.id === a.id);
    if (h === undefined || !saved || h === saved.hoursPerDay) return;
    await save({ ...toAppliance(saved), hoursPerDay: h });
    setHours(({ [a.id]: _done, ...rest }) => rest);
  }
  async function submit() {
    const parsed = parseDraft(draft!);
    if (typeof parsed === "string") return setFormError(parsed);
    try {
      await save(parsed);
      setDraft(null);
    } catch (e) {
      setFormError(`Couldn't save: ${e instanceof Error ? e.message : e}`);
    }
  }
  const open = (d: Draft) => {
    setFormError("");
    setDraft(d);
  };

  return (
    <>
      <div className="page-action">
        <p>See which appliances use the most energy.</p>
        <Button variant="lime" onClick={() => open(emptyDraft())}>
          ＋ Add Appliance
        </Button>
      </div>
      <Card className="appliance-summary">
        <div>
          <p>Estimated monthly units</p>
          <h2>
            {num(total)} <small>units</small>
          </h2>
        </div>
        <div>
          <p>Estimated bill incl. taxes</p>
          <strong>{rs(bill.payable)}</strong>
        </div>
        <div className="donut-chart" aria-hidden>
          {total > 0 && (
            <PieChart width={100} height={100}>
              <Pie data={slices} dataKey="value" innerRadius={28} outerRadius={50} stroke="none" isAnimationActive={false}>
                {slices.map((s, i) => (
                  <Cell key={s.name} fill={SLICE_COLORS[i]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </div>
        <div className="legend">
          {top.map((r, i) => (
            <span key={r.id} style={{ color: SLICE_COLORS[i] }}>
              ● {r.name} {Math.round(r.share * 100)}%
            </span>
          ))}
          {otherShare > 0 && <span style={{ color: "#fff" }}>● Other {Math.round(otherShare * 100)}%</span>}
        </div>
      </Card>

      {data.appliances.length > 0 && <PeriodEstimate />}

      {rows.length === 0 && (
        <div className="empty-state">
          <h2>No appliances yet</h2>
          <p>Add your AC, fans, fridge and motor to see who uses the most.</p>
        </div>
      )}

      <div className="appliance-grid">
        {rows.map((a, i) => (
          <Card key={a.id} className={i % CARD_COLORS.length === 0 ? "dark-card appliance-card" : "appliance-card"} style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}>
            <div className="appliance-top">
              <i aria-hidden>{icon(a.name)}</i>
              <span>
                <button
                  aria-label={`Edit ${a.name}`}
                  onClick={() => open({ id: a.id, ...presetDraft(a) })}
                >
                  ✎
                </button>
                <button aria-label={`Delete ${a.name}`} onClick={() => run((s) => s.deleteAppliance(a.id))}>
                  ×
                </button>
              </span>
            </div>
            <h3>
              {a.name} · {a.watts}W{a.quantity > 1 ? ` × ${a.quantity}` : ""}
            </h3>
            <strong>
              {a.units < 10 ? a.units.toFixed(1) : num(a.units)} units/month · {often(a.daysPerWeek)}
            </strong>
            <label>
              Hours per day <b>{a.hoursPerDay < 1 ? `${a.hoursPerDay * 60} min` : `${a.hoursPerDay}h`}</b>
              <input
                type="range"
                min={0}
                max={24}
                step={0.5}
                value={a.hoursPerDay}
                onChange={(e) => setHours((h) => ({ ...h, [a.id]: Number(e.target.value) }))}
                onPointerUp={() => commitHours(a)}
                onKeyUp={() => commitHours(a)}
                onBlur={() => commitHours(a)}
              />
            </label>
          </Card>
        ))}
      </div>

      {cut && (
        <div className="tip-banner">
          ♧ <b>Cut {cut.appliance.name} by {cut.hours} hr{cut.hours === 1 ? "" : "s"}/day</b> to get under 200 units.
        </div>
      )}
      <p className="legal-note" style={{ marginTop: 16 }}>
        Estimates assume 30 days of use. Estimate based on current NEPRA tariffs. Actual bill may vary.
      </p>

      {draft && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDraft(null)}>
          <div className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-title">
            <button className="modal-close" onClick={() => setDraft(null)} aria-label="Close">
              ×
            </button>
            <h2 id="add-title">{draft.id ? "Edit appliance" : "Add an appliance"}</h2>
            <p>We&apos;ll estimate its monthly energy use.</p>
            {!draft.id && (
              <label>
                Appliance
                <select
                  value={PRESETS.some((p) => p.name === draft.name) ? draft.name : "custom"}
                  onChange={(e) => {
                    const p = PRESETS.find((x) => x.name === e.target.value);
                    setDraft({ ...draft, ...(p ? presetDraft(p) : { name: "" }) });
                  }}
                >
                  {PRESETS.map((p) => (
                    <option key={p.name}>{p.name}</option>
                  ))}
                  <option value="custom">Other…</option>
                </select>
              </label>
            )}
            <div className="form-grid">
              <label className="full">
                Name
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </label>
              <label>
                Watts
                <input inputMode="decimal" value={draft.watts} onChange={(e) => setDraft({ ...draft, watts: e.target.value })} />
              </label>
              <label>
                Quantity
                <input inputMode="numeric" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />
              </label>
              <label>
                Hours each time it runs
                <input inputMode="decimal" value={draft.hoursPerDay} onChange={(e) => setDraft({ ...draft, hoursPerDay: e.target.value })} />
              </label>
              <label>
                Days per week
                <select value={draft.daysPerWeek} onChange={(e) => setDraft({ ...draft, daysPerWeek: e.target.value })}>
                  {[7, 6, 5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n === 7 ? "Every day" : `${n} day${n === 1 ? "" : "s"} a week`}
                    </option>
                  ))}
                </select>
              </label>
              <p className="form-hint full">Use 0.5 for 30 minutes. A fridge runs 24 hours but its compressor cycles, so its real use is often lower.</p>
            </div>
            {formError && <Notice tone="error">{formError}</Notice>}
            <Button className="full-button" onClick={submit}>
              {draft.id ? "Save changes" : "Add Appliance"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
