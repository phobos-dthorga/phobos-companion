/** One question waiting for the owner (the kit's `decisions list`). */
export interface Decision {
  id: string;
  question: string;
  context: string;
  options: { id: string; label: string; detail: string }[];
  lean: string | null;
  why: string;
  from: string;
  asked: string;
  answer: { option: string; words: string; time: string } | null;
}

export interface DecisionsList {
  waiting: number;
  repositories: { repository: string; root: string; decisions: Decision[] }[];
}

export interface AnswerResult {
  ok: boolean;
  refusal: string | null;
}

/** The option kept for "something else", with words. */
export const OTHER = "other";
