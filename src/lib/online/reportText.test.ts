import { describe, expect, it } from "vitest";
import type { LogData, Signature } from "../logs/types";
import { placesFor, reportBody, reportTitle, searchWords } from "./reportText";
import type { ReportPlace } from "./types";

const signature: Signature = {
  id: "s1",
  level: "Error",
  category: "exception",
  signature: "Exception in VehicleTurret.TryReload: NullReferenceException",
  fingerprint: "f",
  count: 42,
  first: { line: 10, time: "12:00:01" },
  last: { line: 900, time: "12:30:00" },
  example: {
    headline: "Exception in VehicleTurret.TryReload",
    body: ["  at VehicleTurret.TryReload ()", "  at Verse.Tick ()"],
    bodyLines: 5,
  },
  evidence: [
    {
      kind: "assembly",
      value: "PhobosFramework",
      mod: "D'thorga Framework",
      messages: 42,
    },
  ],
  frames: [
    {
      method: "VehicleTurret.TryReload",
      file: "Turret.cs",
      line: 88,
      assembly: "x",
    },
  ],
};

const log: LogData["log"] = {
  name: "Player.log",
  layout: "unity",
  lines: 1000,
  messages: 50,
  header: { version: "1.7.5011" },
};

describe("a report to our own repository", () => {
  it("has its title on its own and its stack and lines in fenced blocks", () => {
    expect(reportTitle(signature)).toBe(
      "Exception in VehicleTurret.TryReload: NullReferenceException",
    );
    const body = reportBody(signature, log, "0.65.0");
    expect(body).toContain("Error, 42 times in Player.log, first at 12:00:01");
    expect(body).toContain("**Game version:** 1.7.5011");
    expect(body).toContain(
      "```text\nVehicleTurret.TryReload (Turret.cs:88)\n```",
    );
    expect(body).toContain("(3 more lines in the log.)");
    expect(body).toContain("D'thorga Companion 0.65.0");
    expect(body).not.toContain("Title:");
  });

  it("keeps a long title short", () => {
    const long = { ...signature, signature: "x ".repeat(200) };
    expect(reportTitle(long).length).toBeLessThanOrEqual(150);
  });
});

describe("the places a fault points at", () => {
  const places: ReportPlace[] = [
    {
      mod: "Vehicle Framework",
      id: "vf",
      whose: "theirs",
      repository: "SmashPhil/Vehicle-Framework",
    },
    {
      mod: "D'thorga Framework",
      id: "df",
      whose: "ours",
      repository: "me/game",
    },
    { mod: "Dubs Mint Menus", id: "dm", whose: "unknown", repository: null },
  ];

  it("lists ours first, then theirs, and none that are unknown or not pointed at", () => {
    const clues = [
      { kind: "x", value: "", mod: "Vehicle Framework", messages: 1 },
      { kind: "x", value: "", mod: "D'thorga Framework", messages: 1 },
      { kind: "x", value: "", mod: "Dubs Mint Menus", messages: 1 },
    ];
    expect(placesFor(clues, places).map((p) => p.whose)).toEqual([
      "ours",
      "theirs",
    ]);
    expect(placesFor([], places)).toEqual([]);
  });

  it("searches an author's issues by the fault's longest words", () => {
    expect(searchWords(signature)).toBe(
      "VehicleTurret.TryReload NullReferenceException Exception",
    );
  });
});
