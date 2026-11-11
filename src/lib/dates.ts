// All dates are plain strings: months "YYYY-MM", days "YYYY-MM-DD", computed in UTC to avoid timezone drift.

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export function addMonthsToDate(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return iso(d);
}

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export const monthOf = (day: string) => day.slice(0, 7);

export function todayISO() {
  const d = new Date();
  return iso(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
}

export const monthLabel = (ym: string, withYear = false, locale = "en-US") =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleString(locale, {
    month: "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });

export const formatDate = (day: string, locale = "en-GB") =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(locale === "en-US" ? "en-GB" : locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
