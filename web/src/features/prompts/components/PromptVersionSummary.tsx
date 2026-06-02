import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
import { getPromptTypeBreakdown, getPromptVersionRatio } from "../utils";
import type { RouterOutput } from "@/src/utils/types";

type PromptVersionSummaryData = RouterOutput["prompts"]["versionSummary"];

type PromptVersionSummaryProps = {
  summary?: PromptVersionSummaryData;
  isLoading: boolean;
  label?: string;
};

const SummaryItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="flex min-w-28 flex-col gap-1 rounded-md border bg-muted/20 px-3 py-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

export const PromptVersionSummary = ({
  summary,
  isLoading,
  label,
}: PromptVersionSummaryProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="flex flex-col gap-2 border-b px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Prompt library summary</span>
        {label ? <Badge variant="secondary">{label}</Badge> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <SummaryItem
          label="Prompts"
          value={summary.promptCount.toLocaleString()}
        />
        <SummaryItem
          label="Versions"
          value={summary.versionCount.toLocaleString()}
        />
        <SummaryItem
          label="Avg. versions"
          value={getPromptVersionRatio(summary)}
        />
        <SummaryItem label="Types" value={getPromptTypeBreakdown(summary)} />
        <SummaryItem
          label="Latest version"
          value={summary.latestVersion.toLocaleString()}
        />
        <SummaryItem
          label="Labeled versions"
          value={summary.protectedLabelCount.toLocaleString()}
        />
      </div>
    </div>
  );
};
