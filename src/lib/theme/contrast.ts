/** WCAG 2.2 relative luminance and contrast, for colours written as #RRGGBB. */
export function luminance(hex: string): number {
  const channel = (start: number) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrast(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

/** `share` of `fore` over `back`, both #RRGGBB, channel by channel as CSS's `color-mix(in srgb, ...)` mixes them. */
export function mix(fore: string, back: string, share: number): string {
  const channel = (hex: string, start: number) =>
    parseInt(hex.slice(start, start + 2), 16);
  const mixed = (start: number) =>
    Math.min(
      255,
      Math.max(
        0,
        Math.round(
          channel(fore, start) * share + channel(back, start) * (1 - share),
        ),
      ),
    )
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");
  return `#${mixed(1)}${mixed(3)}${mixed(5)}`;
}
