/**
 * Every action a key can do, where it works and its default key (agent's defaults, owner to change: single keys, so no action
 * needs two keys held at once). A scope is where it works: everywhere outside a dialog, in the code viewer, or in the connections
 * view (on the Code map page or inside the code viewer).
 */
export type Scope =
  | "everywhere"
  | "code"
  | "connections"
  | "memory"
  | "explorer"
  /** A picture or a sound being compared (0.55.0): in the code viewer, on the Mods page, a screenshot, the Picks page. */
  | "media"
  /** The Picks page (0.55.0). */
  | "picks"
  /** The Publish page (0.69.0). */
  | "publish";

export type Action = {
  id: string;
  scope: Scope;
  defaultKey: string | null;
  /** The words for it in the catalogue, written out so the catalogue check can find them. */
  words: string;
  /** A feature for AI agent sessions (0.37.0): listed and offered only while those are shown. */
  forAgents?: true;
};

export const ACTIONS: Action[] = [
  {
    id: "page.home",
    scope: "everywhere",
    defaultKey: "1",
    words: "shortcut-page-home",
  },
  {
    id: "page.reports",
    scope: "everywhere",
    defaultKey: "g",
    words: "shortcut-page-reports",
  },
  {
    id: "page.atlas",
    scope: "everywhere",
    defaultKey: "6",
    words: "shortcut-page-atlas",
  },
  {
    id: "page.tests",
    scope: "everywhere",
    defaultKey: "4",
    words: "shortcut-page-tests",
  },
  {
    id: "page.mods",
    scope: "everywhere",
    defaultKey: "2",
    words: "shortcut-page-mods",
  },
  {
    id: "page.modlist",
    scope: "everywhere",
    defaultKey: "3",
    words: "shortcut-page-modlist",
  },
  {
    id: "page.changes",
    scope: "everywhere",
    defaultKey: "7",
    words: "shortcut-page-changes",
  },
  {
    id: "page.timeline",
    scope: "everywhere",
    defaultKey: "8",
    words: "shortcut-page-timeline",
  },
  {
    id: "page.codemap",
    scope: "everywhere",
    defaultKey: "9",
    words: "shortcut-page-codemap",
  },
  {
    id: "page.settings",
    scope: "everywhere",
    defaultKey: "s",
    words: "shortcut-page-settings",
  },
  {
    id: "page.logs",
    scope: "everywhere",
    defaultKey: "5",
    words: "shortcut-page-logs",
  },
  {
    id: "page.makeup",
    scope: "everywhere",
    defaultKey: "m",
    words: "shortcut-page-makeup",
  },
  {
    id: "page.decisions",
    scope: "everywhere",
    defaultKey: "d",
    words: "shortcut-page-decisions",
    forAgents: true,
  },
  {
    id: "page.picks",
    scope: "everywhere",
    defaultKey: "Shift+p",
    words: "shortcut-page-picks",
    forAgents: true,
  },
  {
    id: "page.chat",
    scope: "everywhere",
    defaultKey: "Shift+c",
    words: "shortcut-page-chat",
  },
  {
    id: "page.publish",
    scope: "everywhere",
    defaultKey: "Shift+w",
    words: "shortcut-page-publish",
  },
  {
    id: "page.about",
    scope: "everywhere",
    defaultKey: "i",
    words: "shortcut-page-about",
  },
  {
    id: "page.gamefiles",
    scope: "everywhere",
    defaultKey: "w",
    words: "shortcut-page-gamefiles",
  },
  // 0.95.0: Safe copies, a page of its own (the owner's choice by card, 25 Nov 2026: Shift+B, B for backup).
  {
    id: "page.safecopies",
    scope: "everywhere",
    defaultKey: "Shift+b",
    words: "shortcut-page-safecopies",
  },
  {
    id: "page.memory",
    scope: "everywhere",
    defaultKey: "u",
    words: "shortcut-page-memory",
  },
  /** The Explorer (agent's choice of V, an open decision: changeable like every page key). */
  {
    id: "page.explorer",
    scope: "everywhere",
    defaultKey: "v",
    words: "shortcut-page-explorer",
  },
  {
    id: "game.previous",
    scope: "everywhere",
    defaultKey: "[",
    words: "shortcut-game-previous",
  },
  {
    id: "game.next",
    scope: "everywhere",
    defaultKey: "]",
    words: "shortcut-game-next",
  },
  {
    id: "look-again",
    scope: "everywhere",
    defaultKey: "r",
    words: "shortcut-look-again",
  },
  {
    id: "search",
    scope: "everywhere",
    defaultKey: "/",
    words: "shortcut-search",
  },
  {
    id: "picture",
    scope: "everywhere",
    defaultKey: "p",
    words: "shortcut-picture",
  },
  {
    id: "screen-note",
    scope: "everywhere",
    defaultKey: "!",
    words: "shortcut-screen-note",
    forAgents: true,
  },
  { id: "help", scope: "everywhere", defaultKey: "?", words: "shortcut-help" },
  /** The Guide (0.34.0): F1, Windows' usual help key, opens it at the page shown; the page itself has no key of its own. */
  {
    id: "guide.here",
    scope: "everywhere",
    defaultKey: "F1",
    words: "shortcut-guide-here",
  },
  {
    id: "page.guide",
    scope: "everywhere",
    defaultKey: null,
    words: "shortcut-page-guide",
  },
  {
    id: "nav.back",
    scope: "everywhere",
    defaultKey: ",",
    words: "shortcut-nav-back",
  },
  // A page's tabs (0.66.0; the owner's choice of 23 Nov 2026: ; and ' to step, Alt + a number to jump). They work while a page
  // with tabs is on screen.
  {
    id: "tab.previous",
    scope: "everywhere",
    defaultKey: ";",
    words: "shortcut-tab-previous",
  },
  {
    id: "tab.next",
    scope: "everywhere",
    defaultKey: "'",
    words: "shortcut-tab-next",
  },
  {
    id: "tab.1",
    scope: "everywhere",
    defaultKey: "Alt+1",
    words: "shortcut-tab-1",
  },
  {
    id: "tab.2",
    scope: "everywhere",
    defaultKey: "Alt+2",
    words: "shortcut-tab-2",
  },
  {
    id: "tab.3",
    scope: "everywhere",
    defaultKey: "Alt+3",
    words: "shortcut-tab-3",
  },
  {
    id: "tab.4",
    scope: "everywhere",
    defaultKey: "Alt+4",
    words: "shortcut-tab-4",
  },
  {
    id: "tab.5",
    scope: "everywhere",
    defaultKey: "Alt+5",
    words: "shortcut-tab-5",
  },
  {
    id: "tab.6",
    scope: "everywhere",
    defaultKey: "Alt+6",
    words: "shortcut-tab-6",
  },
  {
    id: "tab.7",
    scope: "everywhere",
    defaultKey: "Alt+7",
    words: "shortcut-tab-7",
  },
  {
    id: "tab.8",
    scope: "everywhere",
    defaultKey: "Alt+8",
    words: "shortcut-tab-8",
  },
  {
    id: "tab.9",
    scope: "everywhere",
    defaultKey: "Alt+9",
    words: "shortcut-tab-9",
  },
  {
    id: "nav.forward",
    scope: "everywhere",
    defaultKey: ".",
    words: "shortcut-nav-forward",
  },
  {
    id: "code.changes",
    scope: "code",
    defaultKey: "c",
    words: "shortcut-code-changes",
  },
  {
    id: "code.new",
    scope: "code",
    defaultKey: "n",
    words: "shortcut-code-new",
  },
  {
    // The code as it was (0.78.0): Shift with N, the code as it now stands, since every single letter is taken.
    id: "code.old",
    scope: "code",
    defaultKey: "Shift+n",
    words: "shortcut-code-old",
  },
  {
    id: "code.connections",
    scope: "code",
    defaultKey: "h",
    words: "shortcut-code-connections",
  },
  {
    id: "code.next-file",
    scope: "code",
    defaultKey: "j",
    words: "shortcut-code-next-file",
  },
  {
    id: "code.previous-file",
    scope: "code",
    defaultKey: "k",
    words: "shortcut-code-previous-file",
  },
  {
    id: "media.flick",
    scope: "media",
    defaultKey: "z",
    words: "shortcut-media-flick",
  },
  {
    id: "media.play",
    scope: "media",
    defaultKey: "y",
    words: "shortcut-media-play",
  },
  {
    id: "media.zoom",
    scope: "media",
    defaultKey: "=",
    words: "shortcut-media-zoom",
  },
  // The Picks page (0.55.0): J and K step through tries as they step through files in the code viewer, never on screen together.
  {
    id: "picks.next-try",
    scope: "picks",
    defaultKey: "j",
    words: "shortcut-picks-next-try",
    forAgents: true,
  },
  {
    id: "picks.previous-try",
    scope: "picks",
    defaultKey: "k",
    words: "shortcut-picks-previous-try",
    forAgents: true,
  },
  {
    id: "picks.next-pick",
    scope: "picks",
    defaultKey: "Shift+j",
    words: "shortcut-picks-next-pick",
    forAgents: true,
  },
  {
    id: "picks.previous-pick",
    scope: "picks",
    defaultKey: "Shift+k",
    words: "shortcut-picks-previous-pick",
    forAgents: true,
  },
  {
    id: "picks.choose",
    scope: "picks",
    defaultKey: "Ctrl+Enter",
    words: "shortcut-picks-choose",
    forAgents: true,
  },
  {
    id: "picks.none",
    scope: "picks",
    defaultKey: "Shift+n",
    words: "shortcut-picks-none",
    forAgents: true,
  },
  {
    id: "publish.next-mod",
    scope: "publish",
    defaultKey: "j",
    words: "shortcut-publish-next-mod",
  },
  {
    id: "publish.previous-mod",
    scope: "publish",
    defaultKey: "k",
    words: "shortcut-publish-previous-mod",
  },
  {
    id: "publish.prepare",
    scope: "publish",
    defaultKey: "e",
    words: "shortcut-publish-prepare",
  },
  {
    id: "publish.upload",
    scope: "publish",
    defaultKey: "Shift+u",
    words: "shortcut-publish-upload",
  },
  {
    id: "publish.public",
    scope: "publish",
    defaultKey: "Shift+m",
    words: "shortcut-publish-public",
  },
  {
    id: "publish.read-back",
    scope: "publish",
    defaultKey: "b",
    words: "shortcut-publish-read-back",
  },
  {
    id: "publish.update-all",
    scope: "publish",
    defaultKey: "Shift+a",
    words: "shortcut-publish-update-all",
  },
  {
    id: "publish.open-steam",
    scope: "publish",
    defaultKey: "o",
    words: "shortcut-publish-open-steam",
  },
  {
    id: "connections.around",
    scope: "connections",
    defaultKey: "a",
    words: "shortcut-connections-around",
  },
  {
    id: "connections.flow",
    scope: "connections",
    defaultKey: "f",
    words: "shortcut-connections-flow",
  },
  {
    id: "connections.list",
    scope: "connections",
    defaultKey: "l",
    words: "shortcut-connections-list",
  },
  {
    id: "connections.zoom-in",
    scope: "connections",
    defaultKey: "+",
    words: "shortcut-connections-zoom-in",
  },
  {
    id: "connections.zoom-out",
    scope: "connections",
    defaultKey: "-",
    words: "shortcut-connections-zoom-out",
  },
  {
    id: "connections.fit",
    scope: "connections",
    defaultKey: "0",
    words: "shortcut-connections-fit",
  },
  {
    id: "connections.back",
    scope: "connections",
    defaultKey: "Backspace",
    words: "shortcut-connections-back",
  },
  {
    id: "memory.start",
    scope: "memory",
    defaultKey: "t",
    words: "shortcut-memory-start",
  },
  {
    id: "memory.mark",
    scope: "memory",
    defaultKey: "b",
    words: "shortcut-memory-mark",
  },
  {
    id: "memory.stop",
    scope: "memory",
    defaultKey: "x",
    words: "shortcut-memory-stop",
  },
  /** The Explorer's moves (agent's choices, all changeable): take a snapshot (asks first), let it go, back to the overview. */
  {
    id: "explorer.look",
    scope: "explorer",
    defaultKey: "e",
    words: "shortcut-explorer-look",
  },
  {
    id: "explorer.release",
    scope: "explorer",
    defaultKey: "q",
    words: "shortcut-explorer-release",
  },
  {
    id: "explorer.overview",
    scope: "explorer",
    defaultKey: "o",
    words: "shortcut-explorer-overview",
  },
  // 0.91.0: C for the checks, as the code viewer's C (its changes) is never on screen with the Explorer.
  {
    id: "explorer.checks",
    scope: "explorer",
    defaultKey: "c",
    words: "shortcut-explorer-checks",
  },
];

export const SCOPES: { scope: Scope; words: string }[] = [
  { scope: "everywhere", words: "shortcut-scope-everywhere" },
  { scope: "code", words: "shortcut-scope-code" },
  { scope: "connections", words: "shortcut-scope-connections" },
  { scope: "memory", words: "shortcut-scope-memory" },
  { scope: "explorer", words: "shortcut-scope-explorer" },
  { scope: "media", words: "shortcut-scope-media" },
  { scope: "picks", words: "shortcut-scope-picks" },
  { scope: "publish", words: "shortcut-scope-publish" },
];

/**
 * Which scopes can work at the same moment (0.55.0; the owner, 23 Nov 2026, once every letter was taken: "repeat where never
 * together (while trying to prevent confusion)"). Two actions may share a key only when their scopes are never on screen together,
 * and a repeated key is given a like move in each (J and K step through items wherever they appear).
 */
const TOGETHER: Record<Scope, Scope[]> = {
  everywhere: [
    "everywhere",
    "code",
    "connections",
    "memory",
    "explorer",
    "media",
    "picks",
    "publish",
  ],
  code: ["everywhere", "code", "connections", "media"],
  connections: ["everywhere", "code", "connections"],
  memory: ["everywhere", "memory"],
  explorer: ["everywhere", "explorer"],
  media: ["everywhere", "code", "media", "picks"],
  picks: ["everywhere", "media", "picks"],
  publish: ["everywhere", "publish"],
};

/** Whether two scopes' keys can work at the same moment, so may not share a key. */
export function together(a: Scope, b: Scope): boolean {
  return TOGETHER[a].includes(b);
}

export function action(id: string): Action | undefined {
  return ACTIONS.find((a) => a.id === id);
}
