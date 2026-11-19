/** What a copy of the Companion's records holds, where it goes and how old the newest is (the kit's `records status`). */
export interface RecordsStatus {
  folder: string | null;
  folderExists: boolean;
  records: { name: string; path: string; files: number; bytes: number }[];
  copies: { name: string; time: string; files: number; bytes: number }[];
  newest: { name: string; time: string; files: number; bytes: number } | null;
  ageDays: number | null;
  staleDays: number;
  stale: boolean;
}

export interface BackupResult {
  ok: boolean;
  refusal: string | null;
  copy: { path: string; name: string; files: number; bytes: number } | null;
}
