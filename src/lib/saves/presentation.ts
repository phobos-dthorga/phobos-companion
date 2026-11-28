import type { Part } from "./types";

/** The words a part of a save is shown with (agent's choices, `docs/save-explorer.md`): a list item is "item", the rest as saved. */
export function partWords(name: string): string {
  return name === "li" ? "item" : name;
}

/** The last name of a part's path, as a level lists it. */
export function lastName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** The parts one level below a place (the top when none), from what `schema --depth 1` gave, the place itself left out. */
export function childrenOf(parts: Part[], under: string | null): Part[] {
  const depth = under ? under.split("/").length + 1 : 1;
  return parts.filter(
    (p) =>
      p.path !== under &&
      p.path.split("/").length === depth &&
      (!under || p.path.startsWith(`${under}/`)),
  );
}

/** Each step from the top of the save to a place, for the breadcrumb: its path and its name. */
export function stepsTo(
  place: string | null,
): { path: string; name: string }[] {
  if (!place) return [];
  const names = place.split("/");
  return names.map((name, index) => ({
    path: names.slice(0, index + 1).join("/"),
    name,
  }));
}
