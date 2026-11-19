/** One group of what the tools, builds and tests left behind (phobos-modkit 1.50.0 cleanup). */
export type CleanupGroup = {
  group: string;
  items: number;
  bytes: number;
  why: string;
};

/** What could go, by group, largest first, across the repositories with their own rules. */
export type CleanupListing = {
  groups: CleanupGroup[];
  bytes: number;
  daemons: number;
  repositories: string[];
  notes: string[];
};
