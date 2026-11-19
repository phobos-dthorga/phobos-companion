/** What a game writes and what Steam records about it (the kit's `game-files report`). Times in seconds since 1970, or ISO. */
export interface GameFiles {
  name: string;
  game: {
    appId: number;
    name: string;
    buildId: string | null;
    lastUpdatedAt: string;
    lastPlayedAt: string;
    sizeOnDisk: number | null;
  } | null;
  places: { data: string | null; saves: string | null; screenshots: string[] };
  changed: {
    since: string;
    sinceLastPlayed: boolean;
    gameUpdated: boolean;
    workshop: {
      id: string;
      title: string | null;
      bytes: number;
      updated: number;
      updatedAt: string;
    }[];
    workshopCount: number;
    workshopInstalled: number;
    /** phobos-modkit 1.51.0: compared with the launch before the last, when asked for and known. */
    sincePrevious?: boolean;
    previousLaunchAt?: string;
    launchesSeen?: number;
  };
  saves: {
    list: {
      name: string;
      file: string;
      bytes: number;
      modified: number;
      auto: boolean;
      folder: boolean;
    }[];
    count: number;
    bytes: number;
    autosaves: number;
  };
  screenshots: {
    list: {
      path: string;
      name: string;
      bytes: number;
      taken: number;
      source: string;
    }[];
    count: number;
    bytes: number;
  };
  space: {
    data: { name: string; files: number; bytes: number; folder: boolean }[];
    dataBytes: number;
    install: number | null;
    workshop: number;
  };
}

/** How far back "what changed" looks: since the last launch, or a day or a week. */
export type Since = "launch" | "day" | "week";
