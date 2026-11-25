import { describe, expect, it } from "vitest";
import { NOTHING_SAVED } from "./bindings";
import { dispatch, register } from "./registry";

function press(key: string, extra: Record<string, unknown> = {}) {
  const event = {
    key,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: null,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    ...extra,
  };
  return event;
}

describe("dispatching a key", () => {
  it("runs the newest view's action, and only outside a dialog for the page's own", () => {
    const done: string[] = [];
    const page = register({
      scope: "everywhere",
      inDialog: false,
      run: { "page.timeline": () => done.push("page") },
    });
    expect(dispatch(press("8"), NOTHING_SAVED, false)).toBe(true);
    expect(dispatch(press("8"), NOTHING_SAVED, true)).toBe(false);
    const viewer = register({
      scope: "code",
      inDialog: true,
      run: { "code.next-file": () => done.push("next") },
    });
    expect(dispatch(press("j"), NOTHING_SAVED, true)).toBe(true);
    expect(dispatch(press("j"), NOTHING_SAVED, false)).toBe(false);
    viewer();
    page();
    expect(dispatch(press("8"), NOTHING_SAVED, false)).toBe(false);
    expect(done).toEqual(["page", "next"]);
  });

  it("leaves a press already handled, or typed into a box, alone", () => {
    const done: string[] = [];
    const page = register({
      scope: "everywhere",
      inDialog: false,
      run: { "page.timeline": () => done.push("page") },
    });
    expect(
      dispatch(press("7", { defaultPrevented: true }), NOTHING_SAVED, false),
    ).toBe(false);
    expect(
      dispatch(
        press("7", { target: { closest: () => ({}) } }),
        NOTHING_SAVED,
        false,
      ),
    ).toBe(false);
    expect(
      dispatch(press("8"), { ...NOTHING_SAVED, enabled: false }, false),
    ).toBe(false);
    page();
    expect(done).toEqual([]);
  });
});
