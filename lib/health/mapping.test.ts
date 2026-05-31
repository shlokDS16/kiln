import {
  classifySleep,
  computeKilnTemp,
  computeVesselHealth,
  emptySnapshot,
  shouldAutoFire,
  type HealthSnapshot,
} from "./mapping";

describe("computeVesselHealth", () => {
  it("returns 0 when HRV is null", () => {
    expect(computeVesselHealth(null)).toBe(0);
  });
  it("returns 0 for non-finite / non-positive", () => {
    expect(computeVesselHealth(0)).toBe(0);
    expect(computeVesselHealth(NaN)).toBe(0);
  });
  it("scales 20-100ms into 0-100 and clamps", () => {
    expect(computeVesselHealth(20)).toBe(0);
    expect(computeVesselHealth(60)).toBe(50);
    expect(computeVesselHealth(100)).toBe(100);
    expect(computeVesselHealth(140)).toBe(100); // clamp
  });
});

describe("classifySleep", () => {
  it("0 hours is depleted", () => {
    expect(classifySleep(0, 0)).toBe("depleted");
  });
  it("7h uninterrupted is restored", () => {
    expect(classifySleep(7.5, 0)).toBe("restored");
  });
  it("7h but many interruptions drops to partial", () => {
    expect(classifySleep(7.5, 4)).toBe("partial");
  });
  it("5-7h is partial", () => {
    expect(classifySleep(6, 0)).toBe("partial");
  });
});

describe("computeKilnTemp", () => {
  it("floors at 750 with empty snapshot + 0 completion", () => {
    expect(computeKilnTemp(emptySnapshot(), 0)).toBe(750);
  });
  it("rises with completion, vessel, steps", () => {
    const s: HealthSnapshot = { ...emptySnapshot(), vesselHealth: 80, stepsToday: 10000 };
    // 750 + 100 + 40 + 30 = 920
    expect(computeKilnTemp(s, 1)).toBe(920);
  });
  it("clamps at 1100", () => {
    const s: HealthSnapshot = { ...emptySnapshot(), vesselHealth: 100, stepsToday: 99999 };
    expect(computeKilnTemp(s, 1)).toBeLessThanOrEqual(1100);
  });
});

describe("shouldAutoFire", () => {
  const base = emptySnapshot();
  it("sleep fires at/over target (default 7)", () => {
    expect(shouldAutoFire({ dimension: "sleep" }, { ...base, sleepHours: 7 })).toBe(true);
    expect(shouldAutoFire({ dimension: "sleep" }, { ...base, sleepHours: 6 })).toBe(false);
    expect(shouldAutoFire({ dimension: "sleep", target_value: 8 }, { ...base, sleepHours: 7 })).toBe(false);
  });
  it("body fires on a 20min+ workout", () => {
    expect(shouldAutoFire({ dimension: "body" }, { ...base, workoutsToday: [{ type: "Running", duration_min: 25, calories: 200 }] })).toBe(true);
    expect(shouldAutoFire({ dimension: "body" }, { ...base, workoutsToday: [{ type: "Walk", duration_min: 10, calories: 50 }] })).toBe(false);
  });
  it("mind fires at 10+ mindful minutes", () => {
    expect(shouldAutoFire({ dimension: "mind" }, { ...base, mindfulMinutesToday: 10 })).toBe(true);
    expect(shouldAutoFire({ dimension: "mind" }, { ...base, mindfulMinutesToday: 5 })).toBe(false);
  });
  it("other dimensions never auto-fire", () => {
    const loud = { ...base, sleepHours: 9, mindfulMinutesToday: 99 };
    expect(shouldAutoFire({ dimension: "habit" }, loud)).toBe(false);
    expect(shouldAutoFire({ dimension: "deep_work" }, loud)).toBe(false);
    expect(shouldAutoFire({ dimension: "focus_discipline" }, loud)).toBe(false);
    expect(shouldAutoFire({ dimension: "energy" }, loud)).toBe(false);
    expect(shouldAutoFire({ dimension: "mood" }, loud)).toBe(false);
    expect(shouldAutoFire({ dimension: "diet" }, loud)).toBe(false);
  });
});
