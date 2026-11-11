"use client";

import { useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { useData } from "@/components/DataProvider";
import { useI18n } from "@/components/LanguageProvider";
import { PeriodEstimate } from "@/components/PeriodEstimate";
import { SetupPrompt } from "@/components/SetupPrompt";
import { Button, C, Card, Loading, Notice, num } from "@/components/ui";
import type { Key } from "@/i18n";
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

function parseDraft(d: Draft): NewAppliance | Key {
  const watts = Number(d.watts), quantity = Number(d.quantity), hoursPerDay = Number(d.hoursPerDay), daysPerWeek = Number(d.daysPerWeek);
  if (!d.name.trim()) return "ap.err.name";
  if (!(watts > 0 && watts <= 10000)) return "ap.err.watts";
  if (!(Number.isInteger(quantity) && quantity >= 1 && quantity <= 50)) return "ap.err.qty";
  if (!(hoursPerDay >= 0 && hoursPerDay <= 24)) return "ap.err.hours";
  if (!(Number.isInteger(daysPerWeek) && daysPerWeek >= 1 && daysPerWeek <= 7)) return "ap.err.days";
  return { id: d.id, name: d.name.trim().slice(0, 60), watts, quantity, hoursPerDay, daysPerWeek };
}

const toAppliance = ({ id, name, watts, quantity, hoursPerDay, daysPerWeek }: Appliance): Appliance =>
  ({ id, name, watts, quantity, hoursPerDay, ...(daysPerWeek !== undefined && { daysPerWeek }) });

export default function AppliancesPage() {
  const { loading, data, run, summary } = useData();
  const { t, rs, appliance } = useI18n();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [hours, setHours] = useState<Record<string, number>>({});
  if (loading) return <Loading />;
  if (!data) return <SetupPrompt />;

  const often = (days = 7) => (days >= 7 ? t("ap.daily") : t("ap.perWeek", { n: days }));
  const duration = (h: number) => (h < 1 ? t("ap.min", { n: h * 60 }) : t("ap.h", { n: h }));

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
    if (typeof parsed === "string") return setFormError(t(parsed));
    try {
      await save(parsed);
      setDraft(null);
    } catch (e) {
      setFormError(t("common.couldntSave", { e: e instanceof Error ? e.message : String(e) }));
    }
  }
  const open = (d: Draft) => {
    setFormError("");
    setDraft(d);
  };

  return (
    <>
      <div className="page-action">
        <p>{t("ap.lead")}</p>
        <Button variant="lime" onClick={() => open(emptyDraft())}>
          {t("ap.add")}
        </Button>
      </div>
      <Card className="appliance-summary">
        <div>
          <p>{t("ap.monthlyUnits")}</p>
          <h2>
            {num(total)} <small>{t("common.units")}</small>
          </h2>
        </div>
        <div>
          <p>{t("ap.billTaxes")}</p>
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
              ● {appliance(r.name)} {Math.round(r.share * 100)}%
            </span>
          ))}
          {otherShare > 0 && (
            <span style={{ color: "#fff" }}>
              ● {t("ap.other")} {Math.round(otherShare * 100)}%
            </span>
          )}
        </div>
      </Card>

      {data.appliances.length > 0 && <PeriodEstimate />}

      {rows.length === 0 && (
        <div className="empty-state">
          <h2>{t("ap.none")}</h2>
          <p>{t("ap.noneText")}</p>
        </div>
      )}

      <div className="appliance-grid">
        {rows.map((a, i) => (
          <Card
            key={a.id}
            className={i % CARD_COLORS.length === 0 ? "dark-card appliance-card" : "appliance-card"}
            style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
          >
            <div className="appliance-top">
              <i aria-hidden>{icon(a.name)}</i>
              <span>
                <button aria-label={t("ap.edit", { name: appliance(a.name) })} onClick={() => open({ id: a.id, ...presetDraft(a) })}>
                  ✎
                </button>
                <button aria-label={t("ap.delete", { name: appliance(a.name) })} onClick={() => run((s) => s.deleteAppliance(a.id))}>
                  ×
                </button>
              </span>
            </div>
            <h3>
              {appliance(a.name)} · <span dir="ltr">{a.watts}W{a.quantity > 1 ? ` × ${a.quantity}` : ""}</span>
            </h3>
            <strong>
              {t("ap.perMonth", { n: a.units < 10 ? a.units.toFixed(1) : num(a.units) })} · {often(a.daysPerWeek)}
            </strong>
            <label>
              {t("ap.hoursPerDay")} <b>{duration(a.hoursPerDay)}</b>
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
          ♧ <b>{t("ap.cut", { name: appliance(cut.appliance.name), n: cut.hours })}</b> {t("ap.cutRest")}
        </div>
      )}
      <p className="legal-note" style={{ marginTop: 16 }}>
        {t("ap.note")} {t("common.legal")}
      </p>

      {draft && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDraft(null)}>
          <div className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-title">
            <button className="modal-close" onClick={() => setDraft(null)} aria-label={t("common.close")}>
              ×
            </button>
            <h2 id="add-title">{draft.id ? t("ap.editTitle") : t("ap.addTitle")}</h2>
            <p>{t("ap.modalText")}</p>
            {!draft.id && (
              <label>
                {t("ap.appliance")}
                <select
                  value={PRESETS.some((p) => p.name === draft.name) ? draft.name : "custom"}
                  onChange={(e) => {
                    const p = PRESETS.find((x) => x.name === e.target.value);
                    setDraft({ ...draft, ...(p ? presetDraft(p) : { name: "" }) });
                  }}
                >
                  {PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {appliance(p.name)}
                    </option>
                  ))}
                  <option value="custom">{t("ap.otherOpt")}</option>
                </select>
              </label>
            )}
            <div className="form-grid">
              <label className="full">
                {t("ap.name")}
                <input value={appliance(draft.name)} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </label>
              <label>
                {t("ap.watts")}
                <input inputMode="decimal" value={draft.watts} onChange={(e) => setDraft({ ...draft, watts: e.target.value })} />
              </label>
              <label>
                {t("ap.qty")}
                <input inputMode="numeric" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />
              </label>
              <label>
                {t("ap.hoursEach")}
                <input inputMode="decimal" value={draft.hoursPerDay} onChange={(e) => setDraft({ ...draft, hoursPerDay: e.target.value })} />
              </label>
              <label>
                {t("ap.daysWeek")}
                <select value={draft.daysPerWeek} onChange={(e) => setDraft({ ...draft, daysPerWeek: e.target.value })}>
                  {[7, 6, 5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n === 7 ? t("ap.everyDay") : t("ap.nDays", { n })}
                    </option>
                  ))}
                </select>
              </label>
              <p className="form-hint full">{t("ap.hint")}</p>
            </div>
            {formError && <Notice tone="error">{formError}</Notice>}
            <Button className="full-button" onClick={submit}>
              {draft.id ? t("ap.save") : t("ap.addBtn")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
