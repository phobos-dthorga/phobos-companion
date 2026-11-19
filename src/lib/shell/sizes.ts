/** A size in the units a person reads: bytes, KB, MB (Make-up's, shared since 0.22.0 for the records backup). */
export function formatSize(bytes: number, locale: string): string {
  const number = (value: number, digits: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: digits });
  if (bytes < 1024) return `${number(bytes, 0)} B`;
  if (bytes < 1024 * 1024) return `${number(bytes / 1024, 1)} KB`;
  return `${number(bytes / (1024 * 1024), 1)} MB`;
}
