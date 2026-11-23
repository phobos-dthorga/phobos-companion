/**
 * What the Publish page is given (0.69.0): phobos-modkit's `steam-publish` answers (1.99.0 `status`, `pending`, `show`, `page`;
 * 1.101.0 the data of `prepare`, `upload`, `update` and `pull`), passed on by the host as they are.
 */

/** One mod in `status`, dependencies first. */
export type StatusRow = {
  mod: string;
  version?: string;
  itemId: string | null;
  operation?: "create" | "update";
  package: "ready" | "not ready";
  blockers: string[];
  sizes?: {
    titleBytes: number;
    descriptionBytes: number;
    changeNoteBytes: number;
  };
  requires: string[];
  error?: string;
};

/** One mod in `pending`. */
export type PendingRow = {
  mod: string;
  version: string;
  itemId: string | null;
  uploadedVersion: string | null;
  uploadedVisibility: Visibility | null;
  needsUpload: boolean;
};

export type Visibility = "private" | "friends" | "unlisted" | "public";

/** A repository that keeps a Workshop catalogue, as read, or why it could not be. */
export type PublishingRepository =
  | {
      repository: string;
      status: { game: string; appId: string; mods: StatusRow[] };
      pending: { mods: PendingRow[] };
      failure?: undefined;
    }
  | {
      repository: string;
      failure: string;
      status?: undefined;
      pending?: undefined;
    };

export type PublishReading = {
  repositories: PublishingRepository[];
  /** The owner's Workshop uploads setting: off hides Upload and Make public. */
  uploads: boolean;
  /** Whether the Workshop pages kind of going online is on (Read Steam back). */
  steamBack: boolean;
};

/** One upload's receipt, newest first. */
export type Receipt = {
  folder: string;
  version: string | null;
  operation: "create" | "update" | null;
  visibility: Visibility | null;
  via: "steam" | "steamcmd" | null;
  status: string | null;
  itemId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  needsAgreement: boolean | null;
};

/** One mod's card (`show`). A mod that is not ready says why in `error` and shows the rest. */
export type Card = {
  mod: string;
  itemId: string | null;
  uploadedVersion: string | null;
  uploadedVisibility: Visibility | null;
  hold: string | null;
  requires: string[];
  itemUrl: string | null;
  receipts: Receipt[];
  reminders: string[];
  title?: string;
  version?: string;
  tags?: string[];
  operation?: "create" | "update";
  blockers?: string[];
  sizes?: {
    titleBytes: number;
    descriptionBytes: number;
    changeNoteBytes: number;
  };
  requiredItems?: { name: string; itemId: string | null }[];
  changeNote?: string;
  changeNoteVersions?: string[];
  changeNoteOmitted?: string[];
  preview?: string;
  files?: number;
  due?: boolean;
  error?: string;
};

/** A mod's Workshop page as text, with every problem the kit found. */
export type PageText = {
  mod: string;
  path: string;
  exists: boolean;
  text: string;
  title: string;
  version: string;
  bytes: number;
  budget: number;
  problems: string[];
};

/** What a press did: the kit's word, its reason when it refused, and its answer's data. */
export type PressResult = {
  ok: boolean;
  refusal: string | null;
  data: {
    ok?: boolean;
    refusal?: string;
    lines?: string[];
    receipt?: string | null;
    itemId?: string | null;
    status?: string | null;
    whatIf?: boolean;
    updated?: string[];
    candidate?: string;
    written?: string[];
  } | null;
};

/** How an upload reaches Steam: the running Steam client (default) or SteamCMD in a window of its own. */
export type Sender = "steam" | "steamcmd";

/** What an upload press asks for: a new item (always private), an update, or making the item public. */
export type UploadKind = "create" | "update" | "public";
