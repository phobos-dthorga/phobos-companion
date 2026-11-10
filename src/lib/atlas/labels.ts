/*
 * Which labels the globe shows: more important first, and none on top of another. Positions come from the drawing;
 * the choice is plain arithmetic, tested without a screen.
 */
export type LabelCandidate = {
  key: string;
  text: string;
  x: number;
  y: number;
  priority: number;
  kind: "place" | "region";
  colour?: string;
};

export type PlacedLabel = LabelCandidate & {
  width: number;
  height: number;
};

const CHARACTER_PX = { place: 7.2, region: 8.4 };
const LINE_PX = { place: 18, region: 20 };
const PADDING_PX = 8;

export function labelBox(candidate: LabelCandidate): {
  width: number;
  height: number;
} {
  return {
    width: candidate.text.length * CHARACTER_PX[candidate.kind] + PADDING_PX,
    height: LINE_PX[candidate.kind],
  };
}

/** The labels that fit: highest priority first, then in the order given, dropping any that would overlap. */
export function placeLabels(
  candidates: LabelCandidate[],
  width: number,
  height: number,
  limit: number,
): PlacedLabel[] {
  const ordered = candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort(
      (a, b) =>
        b.candidate.priority - a.candidate.priority || a.index - b.index,
    );
  const placed: PlacedLabel[] = [];
  for (const { candidate } of ordered) {
    if (placed.length >= limit) break;
    const box = labelBox(candidate);
    const left = candidate.x - box.width / 2;
    const top = candidate.y - box.height / 2;
    if (
      left < 0 ||
      top < 0 ||
      left + box.width > width ||
      top + box.height > height
    )
      continue;
    const clashes = placed.some(
      (other) =>
        left < other.x + other.width / 2 &&
        left + box.width > other.x - other.width / 2 &&
        top < other.y + other.height / 2 &&
        top + box.height > other.y - other.height / 2,
    );
    if (!clashes) placed.push({ ...candidate, ...box });
  }
  return placed;
}
