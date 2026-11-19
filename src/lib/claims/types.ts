/** One claim on the agent sessions' board (the kit's `claims list`). */
export interface Claim {
  what: string;
  by: string;
  /** When, in UTC (ISO). */
  taken: string;
  note?: string;
  hours: number | null;
  /** Held for a day or more: perhaps a session that ended without letting go. */
  old: boolean;
}

export interface ClaimsBoard {
  board: string;
  oldHours: number;
  claims: Claim[];
}
