/** One copy of the records already made: its folder's name, when (UTC), its size, and whether the timer made it (kit 1.55.0). */
export interface RecordsCopy {
  name: string;
  time: string;
  files: number;
  bytes: number;
  automatic?: boolean;
}

/** What a copy of the Companion's records holds, where it goes and how old the newest is (the kit's `records status`). */
export interface RecordsStatus {
  folder: string | null;
  folderExists: boolean;
  records: { name: string; path: string; files: number; bytes: number }[];
  copies: RecordsCopy[];
  newest: RecordsCopy | null;
  ageDays: number | null;
  staleDays: number;
  stale: boolean;
  /** How often the Companion copies by itself while it is open, in hours, and whether a copy is due now (kit 1.55.0). */
  everyHours?: number;
  due?: boolean;
}

export interface BackupResult {
  ok: boolean;
  refusal: string | null;
  copy: { path: string; name: string; files: number; bytes: number } | null;
}

/** The last copy the timer made or tried in this run of the program (0.29.0). */
export interface Automatic {
  time: string;
  ok: boolean;
  refusal: string | null;
  copy: { path: string; name: string; files: number; bytes: number } | null;
}
