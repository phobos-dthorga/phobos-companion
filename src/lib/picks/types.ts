/** One try of a pick (phobos-modkit 1.83.0 `picks list`): its file, made absolute, and whether it is on this PC. */
export type PickTry = {
  id: string;
  label: string;
  path: string;
  note: string;
  there: boolean;
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
};

/** A colour a game's pictures are seen on, offered beside the Companion's own grounds. */
export type Ground = { name: string; colour: string };

export type PicksList = {
  waiting: number;
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
