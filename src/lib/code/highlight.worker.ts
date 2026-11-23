import type { SetForHighlighter } from "./codeColours";
import { tokenise } from "./shikiCore";
import type { Piece } from "./presentation";

/**
 * Reads code off the window's own thread (0.76.0): VS Code's grammars take about twenty times as long as the old highlighter, so
 * opening a long file never stalls the page. It answers each question with the pieces `shikiCore.ts` gives, or null, in the set of
 * code colours from VS Code the question names (0.77.0), or the theme's own.
 */
type Question = {
  id: number;
  language: string;
  code: string;
  set: SetForHighlighter | null;
};
type Answer = { id: number; lines: Piece[][] | null };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Question>) => void) | null;
  postMessage: (answer: Answer) => void;
};

scope.onmessage = (event) => {
  const { id, language, code, set } = event.data;
  void tokenise(language, code, set).then((lines) =>
    scope.postMessage({ id, lines }),
  );
};
