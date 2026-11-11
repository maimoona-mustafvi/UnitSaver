import defaultTariffs from "@/config/tariffs.json";

export const unitsSaved = (baselineUnits: number, currentUnits: number) => Math.max(0, baselineUnits - currentUnits);

export const co2Kg = (units: number, factor: number = defaultTariffs.gridEmissionFactor) => Math.max(0, units) * factor;
