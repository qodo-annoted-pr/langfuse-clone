import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { api } from "@/src/utils/api";
import { UsageDetailsEditor } from "./UsageDetailsEditor";
import { MatchedModelCard } from "./MatchedModelCard";
import { MatchedTierCard } from "./MatchedTierCard";
import { NoMatchDisplay } from "./NoMatchDisplay";
import { CheckCircle, SquareArrowOutUpRight } from "lucide-react";
import Spinner from "@/src/components/design-system/Spinner/Spinner";
import {
  calculateModelPriceEstimate,
  formatUsdEstimate,
} from "@/src/features/models/utils";

type TestModelMatchDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type { TestModelMatchDialogProps };

export function TestModelMatchDialog({
  projectId,
  open,
  onOpenChange,
}: TestModelMatchDialogProps) {
  const [modelName, setModelName] = useState("");
  const [usageDetails, setUsageDetails] = useState<Record<string, number>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Query for match result - only enabled after submit
  const { data, isLoading, error, refetch } = api.models.testMatch.useQuery(
    {
      projectId,
      modelName,
      usageDetails,
    },
    {
      enabled: false, // Manual trigger only
    },
  );

  // Handle form submission
  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (modelName.trim()) {
      setHasSubmitted(true);
      void refetch();
    }
  };

  const matchedEstimate =
    data?.matched && data.matchedTier
      ? calculateModelPriceEstimate({
          prices: data.matchedTier.prices,
          usageEstimate: usageDetails,
        })
      : null;

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setModelName("");
      setUsageDetails({});
      setHasSubmitted(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="min-h-[62vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Test Model Match</DialogTitle>
            <DialogDescription className="mt-1">
              Test which model and pricing tier your ingestion data would match
              against.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="grid grid-cols-[1fr_1px_1fr] gap-6">
            {/* Left Column: Input Form */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                {/* Model Name Input */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Model Name *</div>
                  <div className="text-muted-foreground text-sm">
                    The model name on your generations.
                  </div>
                  <Input
                    placeholder="e.g. gpt-4-turbo"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value.trim())}
                    autoFocus
                    required
                  />
                </div>

                {/* Usage Details Editor */}
                <UsageDetailsEditor
                  usageDetails={usageDetails}
                  onChange={setUsageDetails}
                />
              </div>

              {/* Buttons at bottom of left column */}
              <div className="flex gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={!modelName.trim() || isLoading}
                  className="flex-1"
                >
                  Test Match
                </Button>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="bg-border" />

            {/* Right Column: Results Panel */}
            <div className="flex flex-col justify-between">
              <div className="space-y-4 overflow-y-auto pb-4">
                {hasSubmitted && (
                  <>
                    {isLoading && (
                      <div className="bg-muted/30 text-muted-foreground flex min-h-[300px] items-center justify-center gap-2 rounded-lg border p-6">
                        <Spinner size="md" />
                        <span>Testing match...</span>
                      </div>
                    )}

                    {error && (
                      <div className="border-destructive/50 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
                        Error: {error.message}
                      </div>
                    )}

                    {!isLoading && !error && data && (
                      <>
                        {data.matched ? (
                          <>
                            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-900 dark:bg-green-950">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                                Match Found
                              </span>
                            </div>
                            <MatchedModelCard model={data.model} />
                            <MatchedTierCard tier={data.matchedTier} />
                            {matchedEstimate && (
                              <div className="rounded-lg border p-4">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                  <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                    Estimated request cost
                                  </div>
                                  <div className="font-mono text-sm font-semibold">
                                    {formatUsdEstimate(
                                      matchedEstimate.totalCost,
                                    )}
                                  </div>
                                </div>
                                {matchedEstimate.lines.length > 0 ? (
                                  <div className="space-y-1">
                                    {matchedEstimate.lines.map((line) => (
                                      <div
                                        key={line.usageType}
                                        className="text-muted-foreground flex items-center justify-between gap-2 text-xs"
                                      >
                                        <span>{line.usageType}</span>
                                        <span className="font-mono">
                                          {line.usageUnits.toLocaleString()} x{" "}
                                          {formatUsdEstimate(line.pricePerUnit)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground text-xs">
                                    Add usage details to preview request cost.
                                  </div>
                                )}
                                {matchedEstimate.missingUsageTypes.length >
                                  0 && (
                                  <div className="text-muted-foreground mt-2 text-xs">
                                    Missing price for{" "}
                                    {matchedEstimate.missingUsageTypes.join(
                                      ", ",
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <NoMatchDisplay modelName={modelName} />
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* View Model Details button at bottom */}
              {hasSubmitted && !isLoading && !error && data?.matched && (
                <div className="border-t pt-4">
                  <Button variant="outline" asChild className="w-full">
                    <Link
                      href={`/project/${projectId}/settings/models/${data.model.id}?pricingTier=${data.matchedTier.id}`}
                      target="_blank"
                    >
                      View Model Details
                      <SquareArrowOutUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </DialogBody>
        </form>
      </DialogContent>
    </Dialog>
  );
}
