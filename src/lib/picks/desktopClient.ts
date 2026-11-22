import { ask } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { PickResult, PicksList } from "./types";

/** The picks waiting for the owner, in every repository on the list that keeps a picks file (0.55.0). */
export async function readPicks(): Promise<
  { state: "ready"; list: PicksList } | Failed
> {
  return ask<PicksList, { state: "ready"; list: PicksList }>(
    "picks_list",
    {},
    (list) => ({ state: "ready", list }),
  );
}

/** Records the owner's pick: a try's id, or "none". The host checks the repository, the ids and the kit's manifest first. */
export async function answerPick(
  repository: string,
  id: string,
  pick: string,
  words: string,
): Promise<{ state: "done"; result: PickResult } | Failed> {
  return ask<PickResult, { state: "done"; result: PickResult }>(
    "answer_pick",
    { repository, id, pick, words },
    (result) => ({ state: "done", result }),
  );
}
