/** The part taken by the Companion and every program it started (0.86.0). */
export type Share = {
  /** Of all the processors together, 0 to 100. */
  cpu: number;
  /** Bytes. */
  memory: number;
  /** Bytes a second. */
  diskRead: number;
  diskWrite: number;
};

/** One reading of the whole computer, a second apart (0.86.0; `companion_core::activity`). */
export type Sample = {
  /** Unix milliseconds. */
  at: number;
  cpu: number;
  memoryUsed: number;
  memoryTotal: number;
  diskRead: number;
  diskWrite: number;
  netDown: number;
  netUp: number;
  ours: Share;
};
