import { LATEST_PROMPT_LABEL, PRODUCTION_LABEL } from "@langfuse/shared";
import type { PromptVersionSummary } from "@langfuse/shared";

export const isReservedPromptLabel = (label: string) => {
  return [PRODUCTION_LABEL, LATEST_PROMPT_LABEL].includes(label);
};

export const getPromptVersionRatio = (
  summary?: Pick<PromptVersionSummary, "promptCount" | "versionCount">,
) => {
  if (!summary || summary.promptCount === 0) return "0.0";

  return (summary.versionCount / summary.promptCount).toFixed(1);
};

export const getPromptTypeBreakdown = (
  summary?: Pick<PromptVersionSummary, "textPromptCount" | "chatPromptCount">,
) => {
  const text = summary?.textPromptCount ?? 0;
  const chat = summary?.chatPromptCount ?? 0;

  return `${text.toLocaleString()} text / ${chat.toLocaleString()} chat`;
};
