/** A theme, as the host checked it (0.33.0; `companion_core::themes`): data only, a colour for each of the window's roles. */
export type Theme = {
  schema_version: number;
  id: string;
  name: string;
  author?: string;
  colours: Record<string, string>;
};

/** A theme on offer: the program's own, or one of the owner's. */
export type Offered = { theme: Theme; built_in: boolean };

/** Every theme on offer, the one in use, and why the chosen one is set aside when it is. */
export type ThemeStatus = {
  chosen: string;
  active: Theme;
  themes: Offered[];
  /** The owner's theme files that could not be read: [file, why]. */
  unreadable: [string, string][];
  fell_back: string | null;
};

/** What an Open or Save did: the themes now, and the file, or null when the dialog was closed. */
export type Moved = { status: ThemeStatus; file: string | null };

/** One pair drawn together that cannot be told apart well enough. */
export type Problem = {
  role: string;
  on: string;
  ratio: number;
  needs: number;
};
