import { ask } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { AnswerResult, DecisionsList } from "./types";

/** The decisions waiting for the owner, in every repository on the list and the Companion's own. */
export async function readDecisions(): Promise<
  { state: "ready"; list: DecisionsList } | Failed
> {
  return ask<DecisionsList, { state: "ready"; list: DecisionsList }>(
    "decisions_list",
    {},
    (list) => ({ state: "ready", list }),
  );
}

/** Records the owner's answer. The host checks the repository, the ids and the kit's manifest first. */
export async function answerDecision(
  repository: string,
  id: string,
  option: string,
  words: string,
): Promise<{ state: "done"; result: AnswerResult } | Failed> {
  return ask<AnswerResult, { state: "done"; result: AnswerResult }>(
    "answer_decision",
    { repository, id, option, words },
    (result) => ({ state: "done", result }),
  );
}
