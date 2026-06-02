import Decimal from "decimal.js";
import { type ChangeEvent, useMemo, useState } from "react";

import { Input } from "@/src/components/ui/input";
import { PriceMapSchema } from "@/src/features/models/validation";
import {
  DEFAULT_SAMPLE_USAGE,
  estimateCostFromPrices,
  formatEstimatedCost,
  getMaxDecimals,
  normalizeSampleUsage,
} from "@/src/features/models/utils";

export function PricePreview({
  prices,
}: {
  prices: Record<string, number | undefined>;
}) {
  const parsedPrices = PriceMapSchema.safeParse(prices);
  const [sampleUsage, setSampleUsage] = useState(DEFAULT_SAMPLE_USAGE);
  const normalizedSampleUsage = normalizeSampleUsage(sampleUsage);
  const estimatedCost = useMemo(
    () => estimateCostFromPrices(prices, normalizedSampleUsage),
    [prices, normalizedSampleUsage],
  );

  const updateSampleUsage = (usageType: keyof typeof sampleUsage) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setSampleUsage((current) => ({
        ...current,
        [usageType]: Number(event.target.value),
      }));
    };
  };

  const getMaxDecimalsForPriceGroup = (
    price: number | undefined,
    multiplier: number,
  ) => {
    return price != null
      ? Math.max(
          ...Object.values(prices).map((price) => {
            return getMaxDecimals(price, multiplier);
          }),
        )
      : 0;
  };

  return (
    <div className="border-border bg-muted/30 rounded-lg border p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h4 className="text-muted-foreground text-sm font-medium">
            Price Preview
          </h4>
        </div>

        {parsedPrices.success ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {(["input", "output", "total"] as const).map((usageType) => (
                <div key={usageType} className="space-y-1">
                  <label className="text-muted-foreground text-xs capitalize">
                    {usageType} units
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={sampleUsage[usageType]}
                    onChange={updateSampleUsage(usageType)}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-md border bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-xs">
                  Estimated cost for sample usage
                </span>
                <span className="font-mono text-sm font-medium">
                  {formatEstimatedCost(estimatedCost)}
                </span>
              </div>
            </div>

            <div className="border-border text-muted-foreground grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 border-b pb-2 text-xs font-medium">
              <span>Usage Type</span>
              <span className="text-right">per unit</span>
              <span className="text-right">per 1K</span>
              <span className="text-right">per 1M</span>
            </div>

            {Object.entries(parsedPrices.data)
              .filter((entry): entry is [string, number] => Boolean(entry[1]))
              .map(([usageType, price]) => (
                <div
                  key={usageType}
                  className="text-muted-foreground grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 rounded px-1 py-0.5 text-xs"
                >
                  <span className="font-medium break-all">{usageType}</span>
                  <span className="text-right font-mono">
                    $
                    {new Decimal(price).toFixed(
                      getMaxDecimalsForPriceGroup(price, 1),
                    )}
                  </span>
                  <span className="text-right font-mono">
                    $
                    {new Decimal(price)
                      .mul(1000)
                      .toFixed(getMaxDecimalsForPriceGroup(price, 1000))}
                  </span>
                  <span className="text-right font-mono">
                    $
                    {new Decimal(price)
                      .mul(1000000)
                      .toFixed(getMaxDecimalsForPriceGroup(price, 1000000))}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            Invalid price entries. Please check your input format.
          </div>
        )}
      </div>
    </div>
  );
}
