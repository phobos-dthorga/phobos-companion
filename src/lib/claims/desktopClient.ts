import { ask } from "../shell/desktopClient";
import type { Failed } from "../shell/types";
import type { ClaimsBoard } from "./types";

/** Who is working on what: the agent sessions' claims board. */
export async function readClaims(): Promise<
  { state: "ready"; board: ClaimsBoard } | Failed
> {
  return ask<ClaimsBoard, { state: "ready"; board: ClaimsBoard }>(
    "claims_list",
    {},
    (board) => ({ state: "ready", board }),
  );
}
