/** When features for AI agent sessions show (0.37.0): only where something shows sessions at work, always, or never. */
export type AgentChoice = "found" | "on" | "off";

/** One thing that showed agent sessions at work: what it is, and the repository it is in (null for the Companion's own folder). */
export type AgentSign = { what: string; repository: string | null };

export type AgentFeatures = {
  choice: AgentChoice;
  shown: boolean;
  signs: AgentSign[];
};
