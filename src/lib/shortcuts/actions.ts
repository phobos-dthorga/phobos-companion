/**
 * Every action a key can do, where it works and its default key (agent's defaults, owner to change: single keys, so no action
 * needs two keys held at once). A scope is where it works: everywhere outside a dialog, in the code viewer, or in the connections
 * view (on the Code map page or inside the code viewer).
 */
export type Scope = "everywhere" | "code" | "connections";

export type Action = {
  id: string;
  scope: Scope;
  defaultKey: string | null;
  /** The words for it in the catalogue, written out so the catalogue check can find them. */
  words: string;
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
    defaultKey: "2",
    words: "shortcut-page-reports",
  },
  {
    id: "page.atlas",
    scope: "everywhere",
    defaultKey: "3",
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
    defaultKey: "5",
    words: "shortcut-page-mods",
  },
  {
    id: "page.changes",
    scope: "everywhere",
    defaultKey: "6",
    words: "shortcut-page-changes",
  },
  {
    id: "page.timeline",
    scope: "everywhere",
    defaultKey: "7",
    words: "shortcut-page-timeline",
  },
  {
    id: "page.codemap",
    scope: "everywhere",
    defaultKey: "8",
    words: "shortcut-page-codemap",
  },
  {
    id: "page.settings",
    scope: "everywhere",
    defaultKey: "9",
    words: "shortcut-page-settings",
  },
  {
    id: "page.logs",
    scope: "everywhere",
    defaultKey: "g",
    words: "shortcut-page-logs",
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
  { id: "help", scope: "everywhere", defaultKey: "?", words: "shortcut-help" },
  {
    id: "nav.back",
    scope: "everywhere",
    defaultKey: ",",
    words: "shortcut-nav-back",
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
];

export const SCOPES: { scope: Scope; words: string }[] = [
  { scope: "everywhere", words: "shortcut-scope-everywhere" },
  { scope: "code", words: "shortcut-scope-code" },
  { scope: "connections", words: "shortcut-scope-connections" },
];

export function action(id: string): Action | undefined {
  return ACTIONS.find((a) => a.id === id);
}
