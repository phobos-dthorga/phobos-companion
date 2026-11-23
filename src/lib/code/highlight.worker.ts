import { tokenise } from "./shikiCore";
import type { Piece } from "./presentation";

/**
 * Reads code off the window's own thread (0.76.0): VS Code's grammars take about twenty times as long as the old highlighter, so
 * opening a long file never stalls the page. It answers each question with the pieces `shikiCore.ts` gives, or null.
 */
type Question = { id: number; language: string; code: string };
type Answer = { id: number; lines: Piece[][] | null };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Question>) => void) | null;
  postMessage: (answer: Answer) => void;
};

scope.onmessage = (event) => {
  const { id, language, code } = event.data;
  void tokenise(language, code).then((lines) =>
    scope.postMessage({ id, lines }),
  );
};
