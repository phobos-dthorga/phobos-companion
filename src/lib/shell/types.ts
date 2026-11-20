export type KitStatus = {
  kit_version: string;
  tools: number;
  /** Where the tool kit came from (0.36.0): named by the environment, beside the repository it was built from, or installed. */
  source?: "environment" | "build-folder" | "installed";
};

export type FailureCode =
  | "python_missing"
  | "kit_missing"
  | "tool_failed"
  | "unreadable"
  | "list_unreadable"
  | "refused"
  | "write_failed";

export type Failure = { code: FailureCode; detail: string };

/** A request the host could not answer. */
export type Failed = { state: "failed"; failure: Failure };

/** What every reading may be before it is ready: still reading, or failed. */
export type Pending = { state: "reading" } | Failed;

/** The same, for a reading that only the desktop program can make. */
export type Waiting = Pending | { state: "browser" };

export type KitReading = Waiting | { state: "ready"; status: KitStatus };
