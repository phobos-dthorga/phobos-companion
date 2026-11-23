import { activeCodeColours, type SetForHighlighter } from "./codeColours";
import { hasGrammar } from "./languages";
import { piecesToHtml, type Piece } from "./presentation";
import table from "./scopeRoles.json";

export { hasGrammar };

/**
 * Colours code by what each piece is (0.76.0: VS Code's grammars, through Shiki; docs/code-reading.md, step 1). The reading runs in
 * a worker, so a long file never stalls the window; where no worker can start (a test, or a worker that failed) it runs here
 * instead. Only `shikiCore.ts` imports Shiki, and only once code is first shown. The pieces come back as HTML whose spans name a
 * role (`tok-keyword`, `tok-string`...), which the theme colours; with a set brought in from a VS Code theme (0.77.0), each span
 * carries that set's colour instead, as the host made it readable on the theme in use.
 */

type Waiting = {
  language: string;
  code: string;
  set: SetForHighlighter | null;
  resolve: (lines: Piece[][] | null) => void;
};

/** The worker: not yet started (undefined), started, or none to be had (null). */
let worker: Worker | null | undefined;
const waiting = new Map<number, Waiting>();
let asked = 0;

async function inThisThread(
  language: string,
  code: string,
  set: SetForHighlighter | null,
): Promise<Piece[][] | null> {
  const { tokenise } = await import("./shikiCore");
  return tokenise(language, code, set);
}

/** Everything still waiting on a worker that failed is read here instead, and later questions too. */
function workerFailed() {
  worker?.terminate();
  worker = null;
  const left = [...waiting.values()];
  waiting.clear();
  for (const question of left)
    void inThisThread(question.language, question.code, question.set).then(
      question.resolve,
    );
}

function theWorker(): Worker | null {
  if (worker !== undefined) return worker;
  if (typeof Worker === "undefined") return (worker = null);
  try {
    worker = new Worker(new URL("./highlight.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    return (worker = null);
  }
  worker.onmessage = (
    event: MessageEvent<{ id: number; lines: Piece[][] | null }>,
  ) => {
    const question = waiting.get(event.data.id);
    waiting.delete(event.data.id);
    question?.resolve(event.data.lines);
  };
  worker.onerror = workerFailed;
  worker.onmessageerror = workerFailed;
  return worker;
}

function pieces(
  language: string,
  code: string,
  set: SetForHighlighter | null,
): Promise<Piece[][] | null> {
  const reader = theWorker();
  if (!reader) return inThisThread(language, code, set);
  return new Promise((resolve) => {
    const id = ++asked;
    waiting.set(id, { language, code, set, resolve });
    reader.postMessage({ id, language, code, set });
  });
}

/**
 * Code as one piece of HTML per line, or null when the language has no grammar here or the highlighter could not be loaded: the
 * caller then shows the text plain, so a failure costs only the colours. Every piece of text is escaped. Coloured in the code
 * colours in use when it is asked.
 */
export async function highlightLines(
  language: string,
  code: string,
): Promise<string[] | null> {
  if (!hasGrammar(language)) return null;
  try {
    const lines = await pieces(language, code, activeCodeColours());
    return lines ? piecesToHtml(lines, table.roles) : null;
  } catch {
    return null;
  }
}
