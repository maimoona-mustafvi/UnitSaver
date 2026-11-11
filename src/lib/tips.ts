import type { TipsRequest } from "@/lib/schemas";
import { applianceMonthlyUnits } from "@/lib/billing/appliances";

const PEAK = /peak|off-peak|tou|time of use/i;

/** Drops peak-hour advice for normal meters (it only pays off on TOU meters). */
export const filterTips = (tips: string[], meterType: TipsRequest["meterType"]) =>
  meterType === "tou" ? tips : tips.filter((t) => !PEAK.test(t));

/** Deterministic tips used when Gemini is unavailable, so the dashboard never shows an empty card. */
export function fallbackTips(req: TipsRequest): string[] {
  const tips: string[] = [];
  const top = [...req.appliances].sort((a, b) => applianceMonthlyUnits(b) - applianceMonthlyUnits(a))[0];
  const over = req.predictedUnits - 200;
  if (req.daysLeft > 0 && req.unitsSoFar < 200)
    tips.push(`Keep to ${((200 - req.unitsSoFar) / req.daysLeft).toFixed(1)} units a day to finish under 200.`);
  if (top) {
    const perHour = applianceMonthlyUnits({ ...top, hoursPerDay: 1 });
    tips.push(`${top.name} uses the most – 1 hour less a day saves about ${Math.round(perHour)} units a month.`);
  }
  if (over > 0) tips.push(`You're on pace to pass 200 by ${Math.round(over)} units – switch off idle fans, lights and chargers.`);
  if (req.meterType === "tou") tips.push("Run the iron, washing machine and water motor outside peak hours (roughly 5–11 pm).");
  tips.push("Set the AC to 26°C and clean its filter – each degree cooler adds about 6% to its use.");
  tips.push("Iron clothes in one batch instead of several short sessions.");
  return tips.slice(0, 3);
}
