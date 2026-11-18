import { t } from "../i18n/runtime";

/** What a changelog calls entries not yet in a version. */
export const UNRELEASED = "Unreleased";

/** A version as people read it: its number, or words for the entries not yet in one. */
export function versionWords(version: string | undefined | null): string {
  if (!version) return "";
  return version === UNRELEASED ? t("changes-unreleased") : version;
}

/** How many of these versions are real versions, leaving out the entries not yet in one. */
export function releasedCount(versions: { version: string }[]): number {
  return versions.filter((v) => v.version !== UNRELEASED).length;
}

/** Entries under their sections (Added, Fixed...), in the order the sections first appear. */
export function sections<T extends { section: string }>(
  entries: T[],
): { section: string; entries: T[] }[] {
  const found: { section: string; entries: T[] }[] = [];
  for (const entry of entries) {
    let group = found.find((s) => s.section === entry.section);
    if (!group) {
      group = { section: entry.section, entries: [] };
      found.push(group);
    }
    group.entries.push(entry);
  }
  return found;
}
