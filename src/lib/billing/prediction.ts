export interface PredictionInput {
  unitsSoFar: number;
  daysElapsed: number;
  daysLeft: number;
  limit?: number;
  alertThreshold?: number;
}

export interface Prediction {
  dailyAvg: number;
  predictedUnits: number;
  /** Units/day allowed to stay ≤ limit; null once the limit is reached or no days are left. */
  dailyBudget: number | null;
  alert: boolean;
}

export function predict({ unitsSoFar, daysElapsed, daysLeft, limit = 200, alertThreshold = 170 }: PredictionInput): Prediction {
  const dailyAvg = daysElapsed > 0 ? unitsSoFar / daysElapsed : 0;
  const predictedUnits = Math.round(unitsSoFar + dailyAvg * Math.max(0, daysLeft));
  const dailyBudget = unitsSoFar < limit && daysLeft > 0 ? (limit - unitsSoFar) / daysLeft : null;
  return { dailyAvg, predictedUnits, dailyBudget, alert: unitsSoFar >= alertThreshold || predictedUnits > limit };
}
