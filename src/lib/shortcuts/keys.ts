import { ACTIONS, type Action } from "./actions";

/** Keys kept for moving around and pressing things, which no shortcut may take. */
export const RESERVED = new Set(["Tab", "Enter", "Space", "Escape"]);

const MODIFIERS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "AltGraph",
  "CapsLock",
  "Fn",
]);

/**
 * The name of the key a press made: "7", "a", "?", "Backspace", "Ctrl+s", "Shift+j". A letter is its lower case; a symbol is what
 * the key typed (so Shift+/ is "?"); Ctrl, Alt and Meta come first when held, and Shift before a letter (0.55.0; the owner's
 * "just using Shift, Ctrl, Alt", once every letter was taken). A modifier pressed alone is no key.
 */
export function keyOf(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "metaKey"> &
    Partial<Pick<KeyboardEvent, "shiftKey">>,
): string | null {
  if (!event.key || MODIFIERS.has(event.key)) return null;
  const key =
    event.key === " "
      ? "Space"
      : event.key.length === 1
        ? event.key.toLowerCase()
        : event.key;
  const held = [
    event.ctrlKey && "Ctrl",
    event.altKey && "Alt",
    event.metaKey && "Meta",
    event.shiftKey && /^[a-z]$/.test(key) && "Shift",
  ].filter(Boolean);
  return [...held, key].join("+");
}

/** A key as people read it: letters in capitals, the rest as named. */
export function keyWords(key: string): string {
  return key
    .split("+")
    .map((part, index, parts) =>
      part === "" && index === parts.length - 1
        ? "+"
        : part.length === 1
          ? part.toUpperCase()
          : part,
    )
    .filter((part, index, parts) => !(part === "" && index < parts.length - 1))
    .join(" + ")
    .replace(" +  + ", " + +");
}

/**
 * Whether a key press belongs to what has the keyboard rather than to the shortcuts: typing in a box, or a part of the window that
 * takes keys itself (the globe).
 */
export function belongsElsewhere(target: EventTarget | null): boolean {
  const element = target as Element | null;
  if (typeof element?.closest !== "function") return false;
  return (
    element.closest(
      "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='application']",
    ) !== null
  );
}

/** The actions in scope, ordered as listed; those for agent sessions only while they are shown (0.37.0). */
export function actionsIn(
  scope: Action["scope"],
  agentsShown = true,
): Action[] {
  return ACTIONS.filter(
    (a) => a.scope === scope && (agentsShown || !a.forAgents),
  );
}
