import { OTHER, type Decision, type DecisionsList } from "./types";

/** The option shown chosen when a decision opens: the owner's answer, else the agent's lean, else none. */
export function firstChoice(decision: Decision): string | null {
  return decision.answer?.option ?? decision.lean ?? null;
}

/** An answer in words: the option's label, or "something else". */
export function chosenLabel(decision: Decision, other: string): string {
  if (!decision.answer) return "";
  if (decision.answer.option === OTHER) return other;
  return (
    decision.options.find((o) => o.id === decision.answer?.option)?.label ??
    decision.answer.option
  );
}

/** Whether Decide can be pressed: a choice, and words when the choice is "something else". */
export function canDecide(choice: string | null, words: string): boolean {
  return choice !== null && (choice !== OTHER || words.trim().length > 0);
}

/** Each repository's open and answered decisions, repositories without any left out. */
export function grouped(list: DecisionsList) {
  return list.repositories
    .map((r) => ({
      repository: r.repository,
      open: r.decisions.filter((d) => d.answer === null),
      answered: r.decisions.filter((d) => d.answer !== null),
    }))
    .filter((r) => r.open.length + r.answered.length > 0);
}
