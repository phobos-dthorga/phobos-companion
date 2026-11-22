import { describe, expect, it } from "vitest";
import { ACTIONS, together } from "./actions";
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
  held: Partial<{
    ctrlKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
  }> = {},
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
  it("give actions that can work together different keys, none of them kept for moving around", () => {
    for (const a of ACTIONS)
      for (const b of ACTIONS)
        if (a !== b && a.defaultKey && a.defaultKey === b.defaultKey)
          expect(together(a.scope, b.scope), `${a.id} and ${b.id}`).toBe(false);
    expect(
      ACTIONS.every(
        (a) =>
          a.defaultKey === null ||
          refusal(a.id, a.defaultKey, NOTHING_SAVED) === null,
      ),
    ).toBe(true);
  });

  // 0.55.0: once every letter was taken, the owner allowed keys held with Shift, Ctrl or Alt ("just using Shift, Ctrl, Alt"); a
  // single key stays first where one is free, and nothing needs more than one key held besides the one pressed.
  it("hold at most one of Shift, Ctrl or Alt", () => {
    for (const a of ACTIONS) {
      if (!a.defaultKey || a.defaultKey === "+") continue;
      const held = a.defaultKey.split("+").slice(0, -1);
      expect(held.length, a.id).toBeLessThanOrEqual(1);
      expect(["Shift", "Ctrl", "Alt"]).toEqual(expect.arrayContaining(held));
    }
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
    expect(refusal("page.timeline", "`", NOTHING_SAVED)).toBeNull();
  });

  it("stores only what differs from the defaults", () => {
    let saved = withKey(NOTHING_SAVED, "page.timeline", "`");
    expect(saved.keys).toEqual({ "page.timeline": "`" });
    expect(actionFor("`", saved, new Set(["everywhere"]))).toBe(
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

describe("keys held together and keys that repeat (0.55.0)", () => {
  it("names Shift before a letter, and leaves a symbol Shift made as it is", () => {
    expect(keyOf(press("J", { shiftKey: true }))).toBe("Shift+j");
    expect(keyOf(press("?", { shiftKey: true }))).toBe("?");
    expect(keyOf(press("Enter", { ctrlKey: true }))).toBe("Ctrl+Enter");
    expect(keyWords("Shift+j")).toBe("Shift + J");
  });

  it("lets a key repeat only where its places are never on screen together", () => {
    expect(refusal("picks.next-try", "j", NOTHING_SAVED)).toBeNull();
    expect(refusal("picks.next-try", "z", NOTHING_SAVED)).toEqual({
      reason: "taken",
      by: "media.flick",
    });
    expect(refusal("code.next-file", "1", NOTHING_SAVED)).toEqual({
      reason: "taken",
      by: "page.home",
    });
  });
});
