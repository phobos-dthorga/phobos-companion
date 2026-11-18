import { describe, expect, it } from "vitest";
import { ACTIONS } from "./actions";
import {
  actionFor,
  fromFile,
  keysNow,
  NOTHING_SAVED,
  refusal,
  withDefault,
  withKey,
} from "./bindings";
import { belongsElsewhere, keyOf, keyWords } from "./keys";

const press = (
  key: string,
  held: Partial<{ ctrlKey: boolean; altKey: boolean; metaKey: boolean }> = {},
) => ({
  key,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  ...held,
});

describe("keys", () => {
  it("names a press the same way whatever case or modifiers", () => {
    expect(keyOf(press("A"))).toBe("a");
    expect(keyOf(press("?"))).toBe("?");
    expect(keyOf(press(" "))).toBe("Space");
    expect(keyOf(press("s", { ctrlKey: true }))).toBe("Ctrl+s");
    expect(keyOf(press("Shift"))).toBeNull();
  });

  it("writes a key as people read it", () => {
    expect(keyWords("a")).toBe("A");
    expect(keyWords("Ctrl+s")).toBe("Ctrl + S");
    expect(keyWords("Backspace")).toBe("Backspace");
  });

  it("leaves a press in a text box to the box", () => {
    const inside = (holds: boolean) =>
      ({ closest: () => (holds ? {} : null) }) as unknown as EventTarget;
    expect(belongsElsewhere(inside(true))).toBe(true);
    expect(belongsElsewhere(inside(false))).toBe(false);
    expect(belongsElsewhere(null)).toBe(false);
  });
});

describe("the defaults", () => {
  it("give every action a different key, none of them kept for moving around", () => {
    const keys = ACTIONS.map((a) => a.defaultKey).filter(Boolean);
    expect(new Set(keys).size).toBe(keys.length);
    expect(
      ACTIONS.every(
        (a) =>
          a.defaultKey === null ||
          refusal(a.id, a.defaultKey, NOTHING_SAVED) === null,
      ),
    ).toBe(true);
  });

  it("need no key held with another", () => {
    expect(
      ACTIONS.every(
        (a) => !a.defaultKey?.includes("+") || a.defaultKey === "+",
      ),
    ).toBe(true);
  });
});

describe("the owner's keys", () => {
  it("does an action only in a scope that is working", () => {
    expect(actionFor("7", NOTHING_SAVED, new Set(["everywhere"]))).toBe(
      "page.timeline",
    );
    expect(actionFor("j", NOTHING_SAVED, new Set(["everywhere"]))).toBeNull();
    expect(actionFor("j", NOTHING_SAVED, new Set(["code"]))).toBe(
      "code.next-file",
    );
  });

  it("does nothing when shortcuts are off", () => {
    expect(
      actionFor(
        "7",
        { ...NOTHING_SAVED, enabled: false },
        new Set(["everywhere"]),
      ),
    ).toBeNull();
  });

  it("refuses a key another action has, or one kept for moving around", () => {
    expect(refusal("page.timeline", "1", NOTHING_SAVED)).toEqual({
      reason: "taken",
      by: "page.home",
    });
    expect(refusal("page.timeline", "Tab", NOTHING_SAVED)).toEqual({
      reason: "reserved",
    });
    expect(refusal("page.timeline", "t", NOTHING_SAVED)).toBeNull();
  });

  it("stores only what differs from the defaults", () => {
    let saved = withKey(NOTHING_SAVED, "page.timeline", "t");
    expect(saved.keys).toEqual({ "page.timeline": "t" });
    expect(actionFor("t", saved, new Set(["everywhere"]))).toBe(
      "page.timeline",
    );
    expect(actionFor("7", saved, new Set(["everywhere"]))).toBeNull();
    saved = withKey(saved, "page.home", null);
    expect(keysNow(saved).get("page.home")).toBeNull();
    saved = withKey(withDefault(saved, "page.timeline"), "page.home", "1");
    expect(saved.keys).toEqual({});
  });

  it("reads a file safely, dropping what it does not know", () => {
    expect(fromFile(null)).toEqual(NOTHING_SAVED);
    expect(
      fromFile({
        format: 1,
        enabled: false,
        keys: { "page.home": "h", "page.gone": "g", "page.atlas": 5 },
      }),
    ).toEqual({
      format: 1,
      enabled: false,
      keys: { "page.home": "h" },
    });
  });
});
