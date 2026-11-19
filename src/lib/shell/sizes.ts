/** A size in the units a person reads: bytes, KB, MB, GB from 1 GB (0.27.0; Make-up's, shared since 0.22.0). */
export function formatSize(bytes: number, locale: string): string {
  const number = (value: number, digits: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: digits });
  if (bytes < 1024) return `${number(bytes, 0)} B`;
  if (bytes < 1024 * 1024) return `${number(bytes / 1024, 1)} KB`;
  if (bytes < 1024 ** 3) return `${number(bytes / (1024 * 1024), 1)} MB`;
  return `${number(bytes / 1024 ** 3, 1)} GB`;
}
