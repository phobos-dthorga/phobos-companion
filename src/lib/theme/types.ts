import type { CodeSet } from "../code/codeColours";

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

/** A set of code colours kept from a VS Code theme (0.77.0; `companion_core::code_colours`). */
export type CodeSetOffered = {
  id: string;
  name: string;
  /** The file it was brought in from, by name. */
  from: string;
  kind: string | null;
  rules: number;
};

/** Every set kept, the choice ("theme" for the theme's own), and the set in use made readable on the theme in use. */
export type CodeColoursStatus = {
  chosen: string;
  sets: CodeSetOffered[];
  active: CodeSet | null;
  unreadable: [string, string][];
  fell_back: string | null;
};

/** A colour theme VS Code, or an editor built from it, has on this computer. */
export type VsCodeTheme = {
  label: string;
  extension: string;
  kind: string;
  file: string;
};

/** What bringing a theme in did: the code colours now, and the file read, or null when the dialog was closed. */
export type MovedCode = { status: CodeColoursStatus; file: string | null };
