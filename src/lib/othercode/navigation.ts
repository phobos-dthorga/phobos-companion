import { go } from "../navigation/navigation.svelte";

/**
 * Opens another author's code on the Code map (0.26.0), from wherever a link to it is: the Code map itself, or the code viewer
 * over another page. A step on the trail, so Back returns.
 */
export function openTheirCode(game: string, repository: string, name: string) {
  go({
    page: "codemap",
    game,
    focus: { repository, their: name },
    dialog: null,
  });
}

/** Opens what an update changed in a kept file, and in one declaration of it when named. */
export function openUpdate(
  game: string,
  repository: string,
  file: string,
  member: string | null = null,
) {
  const focus: Record<string, string> = { repository, update: file };
  if (member) focus.member = member;
  go({ page: "codemap", game, focus, dialog: null });
}
