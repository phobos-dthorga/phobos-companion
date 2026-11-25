/** One try of a pick (phobos-modkit 1.83.0 `picks list`): its file, made absolute, and whether it is on this PC. */
export type PickTry = {
  id: string;
  label: string;
  path: string;
  note: string;
  there: boolean;
  /** For a try shown in a slot's one pick (0.96.0): the card it belongs to, and its id there. */
  card?: string;
  cardTry?: string;
};

/** A picture or a sound waiting for the owner to pick one of its tries. */
export type Pick = {
  id: string;
  title: string;
  kind: "picture" | "sound";
  /** The file a pick would replace, or null for something new. */
  inUse: string | null;
  inUseThere: boolean;
  tries: PickTry[];
  context: string;
  from: string;
  asked: string;
  /** The owner's pick so far: a try's id or "none"; the last one decides. */
  answer: { pick: string; words: string; time: string } | null;
  /** The file it ships as (kit 1.125.0): cards of one slot are one pick (0.96.0). */
  slot?: string;
  /** Its picked try is the file in use, byte for byte (kit 1.125.0). */
  inGame?: boolean;
  /** For a slot's one pick (0.96.0): how many cards it joins. */
  cards?: number;
};

/** A colour a game's pictures are seen on, offered beside the Companion's own grounds. */
export type Ground = { name: string; colour: string };

export type PicksList = {
  waiting: number;
  /** Picks already in the game, settled by themselves as the list was read (0.96.0). */
  settledByItself?: string[];
  repositories: {
    repository: string;
    root: string;
    grounds: Ground[];
    picks: Pick[];
  }[];
};

export type PickResult = { ok: boolean; refusal: string | null };

/** The answer kept when none of the tries will do. */
export const NONE = "none";
