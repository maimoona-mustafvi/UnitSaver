import { describe, expect, it } from "vitest";
import { fallbackTips, filterTips } from "@/lib/tips";

const base = {
  unitsSoFar: 142,
  daysLeft: 12,
  predictedUnits: 232,
  status: "nonProtected" as const,
  appliances: [{ name: "AC 1.5 Ton", watts: 1500, quantity: 1, hoursPerDay: 4 }],
};

describe("tips", () => {
  it("drops peak-hour advice for normal meters only", () => {
    const tips = ["Run the motor off-peak", "Raise the AC to 26°C"];
    expect(filterTips(tips, "normal")).toEqual(["Raise the AC to 26°C"]);
    expect(filterTips(tips, "tou")).toEqual(tips);
  });
  it("fallback gives 3 tips, peak advice only for TOU", () => {
    const normal = fallbackTips({ ...base, meterType: "normal" });
    expect(normal).toHaveLength(3);
    expect(normal.join(" ")).not.toMatch(/peak/i);
    expect(normal[0]).toContain("4.8 units a day");
    expect(normal[1]).toContain("AC 1.5 Ton");
    expect(fallbackTips({ ...base, appliances: [], predictedUnits: 150, meterType: "tou" }).join(" ")).toMatch(/peak/i);
  });
});
