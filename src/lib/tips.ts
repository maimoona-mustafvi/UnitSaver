import type { TipsRequest } from "@/lib/schemas";
import { applianceMonthlyUnits } from "@/lib/billing/appliances";
import { applianceName } from "@/i18n";

const PEAK = /peak|off-peak|tou|time of use|پیک|آف پیک/i;

/** Drops peak-hour advice for normal meters (it only pays off on TOU meters). */
export const filterTips = (tips: string[], meterType: TipsRequest["meterType"]) =>
  meterType === "tou" ? tips : tips.filter((t) => !PEAK.test(t));

const TEXT = {
  en: {
    budget: (n: string) => `Keep to ${n} units a day to finish under 200.`,
    top: (name: string, u: number) => `${name} uses the most – 1 hour less a day saves about ${u} units a month.`,
    over: (u: number) => `You're on pace to pass 200 by ${u} units – switch off idle fans, lights and chargers.`,
    tou: "Run the iron, washing machine and water motor outside peak hours (roughly 5–11 pm).",
    ac: "Set the AC to 26°C and clean its filter – each degree cooler adds about 6% to its use.",
    iron: "Iron clothes in one batch instead of several short sessions.",
  },
  ur: {
    budget: (n: string) => `200 سے کم رہنے کے لیے روزانہ ${n} یونٹ تک محدود رہیں۔`,
    top: (name: string, u: number) => `${name} سب سے زیادہ بجلی لیتا ہے – روزانہ 1 گھنٹہ کم چلانے سے مہینے میں تقریباً ${u} یونٹ بچیں گے۔`,
    over: (u: number) => `اسی رفتار سے آپ 200 سے ${u} یونٹ اوپر جائیں گے – فالتو پنکھے، لائٹس اور چارجر بند کریں۔`,
    tou: "استری، واشنگ مشین اور پانی کی موٹر پیک آورز (تقریباً شام 5 سے رات 11 بجے) کے علاوہ چلائیں۔",
    ac: "اے سی 26 ڈگری پر رکھیں اور اس کا فلٹر صاف کریں – ہر ایک ڈگری کم کرنے سے تقریباً 6% زیادہ بجلی لگتی ہے۔",
    iron: "کپڑے ایک ہی بار میں استری کریں، بار بار تھوڑے تھوڑے نہیں۔",
  },
};

/** Deterministic tips used when Gemini is unavailable, so the dashboard never shows an empty card. */
export function fallbackTips(req: TipsRequest): string[] {
  const lang = req.lang ?? "en";
  const s = TEXT[lang];
  const tips: string[] = [];
  const top = [...req.appliances].sort((a, b) => applianceMonthlyUnits(b) - applianceMonthlyUnits(a))[0];
  const over = req.predictedUnits - 200;
  if (req.daysLeft > 0 && req.unitsSoFar < 200) tips.push(s.budget(((200 - req.unitsSoFar) / req.daysLeft).toFixed(1)));
  if (top) tips.push(s.top(applianceName(lang, top.name), Math.round(applianceMonthlyUnits({ ...top, hoursPerDay: 1 }))));
  if (over > 0) tips.push(s.over(Math.round(over)));
  if (req.meterType === "tou") tips.push(s.tou);
  tips.push(s.ac);
  tips.push(s.iron);
  return tips.slice(0, 3);
}
