import { describe, expect, it } from "vitest";
import { en, type Key } from "./en";
import { ur, urApplianceNames } from "./ur";
import { applianceName, translate } from ".";
import { fallbackTips } from "@/lib/tips";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n", () => {
  it("every Urdu string keeps the English placeholders", () => {
    for (const key of Object.keys(en) as Key[]) {
      expect(placeholders(ur[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it("Urdu strings are actually Urdu (no English left behind in sentences)", () => {
    const untranslated = (Object.keys(en) as Key[]).filter((k) => en[k].length > 12 && ur[k] === en[k]);
    expect(untranslated).toEqual([]);
  });

  it("fills placeholders and formats appliance names", () => {
    expect(translate("en", "common.unitsN", { n: 142 })).toBe("142 units");
    expect(translate("ur", "common.unitsN", { n: 142 })).toBe("142 یونٹ");
    expect(applianceName("ur", "Fridge")).toBe(urApplianceNames.Fridge);
    expect(applianceName("ur", "My custom pump")).toBe("My custom pump");
    expect(applianceName("en", "Fridge")).toBe("Fridge");
  });

  it("rule-based tips come in Urdu with Western digits", () => {
    const tips = fallbackTips({
      unitsSoFar: 142,
      daysLeft: 12,
      predictedUnits: 232,
      status: "nonProtected",
      meterType: "normal",
      lang: "ur",
      appliances: [{ name: "AC 1.5 Ton", watts: 1500, quantity: 1, hoursPerDay: 4 }],
    });
    expect(tips).toHaveLength(3);
    expect(tips[0]).toContain("4.8");
    expect(tips[1]).toContain(urApplianceNames["AC 1.5 Ton"]);
    expect(tips.join(" ")).not.toMatch(/پیک/);
  });
});
