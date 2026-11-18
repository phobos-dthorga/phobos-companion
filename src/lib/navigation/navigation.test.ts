import { describe, expect, it } from "vitest";
import { addressOf, place, placeOf, type Place } from "./place";
import {
  amend,
  arrive,
  back,
  closeDialog,
  forward,
  go,
  here,
  openDialog,
  TRAIL_LIMIT,
  type Trail,
} from "./trail";

const start: Trail = { places: [place("home", "rimworld")], at: 0 };

const code = {
  kind: "code" as const,
  request: {
    repository: "phobos-rimworld",
    changelog: "mods/PhobosFramework/CHANGELOG.md",
    product: "D'thorga Framework",
    entry: {
      version: "0.155.0",
      section: "",
      text: "Boats float.",
      lead: "Boats float.",
    },
    commit: "401c6a93",
  },
};

describe("the trail", () => {
  it("walks back and forward, and a new step drops what Forward would have reached", () => {
    let trail = go(start, place("timeline", "rimworld"));
    trail = go(
      trail,
      place("codemap", "rimworld", { repository: "phobos-rimworld" }),
    );
    expect(here(back(trail)).page).toBe("timeline");
    expect(here(forward(back(trail))).page).toBe("codemap");
    const branched = go(back(trail), place("tests", "rimworld"));
    expect(branched.places.map((p) => p.page)).toEqual([
      "home",
      "timeline",
      "tests",
    ]);
    expect(forward(branched)).toEqual(branched);
    expect(back(start)).toEqual(start);
  });

  it("does not step for going where you are, and a choice on a page amends the place", () => {
    expect(go(start, place("home", "rimworld"))).toBe(start);
    const chosen = amend(go(start, place("changes", "rimworld")), {
      focus: { changelog: "CHANGELOG.md" },
    });
    expect(chosen.places).toHaveLength(2);
    expect(here(chosen).focus.changelog).toBe("CHANGELOG.md");
  });

  it("closes a dialog by stepping back to the page that opened it, so Forward opens it again", () => {
    const page = go(start, place("timeline", "rimworld"));
    const opened = openDialog(page, code);
    const closed = closeDialog(opened);
    expect(here(closed).dialog).toBeNull();
    expect(here(forward(closed)).dialog?.kind).toBe("code");
  });

  it("arrives at a dialog on another page in two steps, so Back leaves you on its page", () => {
    const trail = arrive(start, {
      ...place("changes", "rimworld"),
      dialog: code,
    });
    expect(trail.places).toHaveLength(3);
    expect(here(back(trail))).toEqual(place("changes", "rimworld"));
    const same = arrive(go(start, place("changes", "rimworld")), {
      ...place("changes", "rimworld"),
      dialog: code,
    });
    expect(same.places).toHaveLength(3);
  });

  it("closes a dialog opened from another back to that one", () => {
    const stood = {
      kind: "stood" as const,
      request: {
        repository: "r",
        changelog: "CHANGELOG.md",
        product: "P",
        commit: "abcdef12",
        when: null,
      },
    };
    const trail = openDialog(
      openDialog(go(start, place("timeline", "rimworld")), stood),
      code,
    );
    expect(here(closeDialog(trail)).dialog?.kind).toBe("stood");
  });

  it("keeps at most a hundred places", () => {
    let trail = start;
    for (let i = 0; i < TRAIL_LIMIT + 20; i++)
      trail = go(trail, place("tests", "rimworld", { row: String(i) }));
    expect(trail.places).toHaveLength(TRAIL_LIMIT);
    expect(here(trail).focus.row).toBe(String(TRAIL_LIMIT + 19));
  });
});

describe("addresses", () => {
  it("write a place and read it back the same", () => {
    const places: Place[] = [
      place("codemap", "rimworld", {
        repository: "phobos-rimworld",
        node: "cs:Phobos.Framework.TopUp.Seen.Note",
      }),
      { ...place("timeline", "rimworld"), dialog: code },
      place("settings"),
    ];
    for (const where of places)
      expect(placeOf(addressOf(where))).toEqual(where);
    expect(addressOf(places[0])).toMatch(
      /^dthorga:\/\/codemap\/rimworld\?repository=phobos-rimworld&node=cs%3A/,
    );
  });

  it("refuse anything that is not an address of the Companion's", () => {
    expect(placeOf("https://example.com")).toBeNull();
    expect(placeOf("dthorga://nowhere/rimworld")).toBeNull();
    expect(placeOf("dthorga://tests/rim world")).toBeNull();
    expect(placeOf("dthorga://tests/rimworld?BAD=1")).toBeNull();
    expect(placeOf("dthorga://tests/rimworld?dialog=delete")).toBeNull();
    expect(placeOf("dthorga://tests/rimworld?dialog=code")).toBeNull();
    expect(placeOf("dthorga://tests/rimworld?row=a%0Ab")).toBeNull();
  });
});
