import { describe, expect, it } from "vitest";
import { fromText } from "./viewSettingsKept";

const good = {
  view: "flick",
  zoom: 4,
  backdrop: "ground-0",
  tolerance: 16,
  flicked: "before",
  edges: true,
};

describe("view settings kept between runs", () => {
  it("reads back each place's settings as kept", () => {
    expect(
      fromText(JSON.stringify({ picks: good, code: { ...good, zoom: "fit" } })),
    ).toEqual({
      picks: good,
      code: { ...good, zoom: "fit" },
    });
  });

  it("starts a place afresh when anything kept is not a choice this version offers", () => {
    const found = fromText(
      JSON.stringify({
        picks: good,
        code: { ...good, zoom: 3 },
        mods: { ...good, backdrop: "url(x)" },
        "Bad Place": good,
      }),
    );
    expect(Object.keys(found)).toEqual(["picks"]);
  });

  it("forgets nothing it cannot read, and reads nothing from damaged storage", () => {
    expect(fromText(null)).toEqual({});
    expect(fromText("{not json")).toEqual({});
    expect(fromText("[1, 2]")).toEqual({});
  });
});
