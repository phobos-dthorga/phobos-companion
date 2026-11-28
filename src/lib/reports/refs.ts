import { place, type Place } from "../navigation/place";
import type { Ref } from "./types";

/**
 * Where what a report's row or finding is about opens (0.118.0; phobos-modkit 1.152.0's refs; `docs/performance.md`, X1 to X8):
 * a mod in the Mod list's editor, a method on the Code map (another author's code, read or decompiled), a type in the Explorer,
 * a recording on the Performance page, a day on the Timeline. Null where the Companion has nowhere for it yet: a thread, or a mod
 * whose package ID the recording did not keep.
 */
export function refPlace(
  ref: Ref,
  game: string,
  repository: string | null,
): Place | null {
  switch (ref.kind) {
    case "mod":
      return ref.package
        ? place("modlist", game, { view: "edit", mod: ref.package })
        : null;
    case "method":
      return repository
        ? place("codemap", game, { repository, their: ref.id })
        : null;
    case "type":
      return place("explorer", game, { view: "kind", kind: ref.id });
    case "recording":
      return place("performance", game, { recording: ref.id });
    case "day":
      return /^\d{4}-\d{2}-\d{2}$/.test(ref.id)
        ? place("timeline", game, { day: ref.id })
        : null;
    default:
      return null;
  }
}

/** The message key saying where a ref opens, for a link's accessible name. */
export function refWords(ref: Ref): string {
  switch (ref.kind) {
    case "mod":
      return "ref-open-mod";
    case "method":
      return "ref-open-method";
    case "type":
      return "ref-open-type";
    case "recording":
      return "ref-open-recording";
    case "day":
      return "ref-open-day";
    default:
      return "ref-open";
  }
}

/** A short name for a chip: a mod's name whole; a method or a type by its last two parts. */
export function refName(ref: Ref): string {
  if (ref.kind !== "method" && ref.kind !== "type") return ref.id;
  const plain = ref.id.replace(/`\d+|\[[^\]]*\]/g, "");
  const parts = plain.split(".").filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join(".") : plain;
}

/** A table row's ref for one column, if it has one. */
export function refAt(
  refs: Ref[][] | undefined,
  row: number,
  column: number,
): Ref | null {
  return refs?.[row]?.find((r) => r.column === column) ?? null;
}
