import Decimal from "decimal.js";

import { PriceMapSchema } from "@/src/features/models/validation";
import {
  calculateModelPriceEstimate,
  formatUsdEstimate,
  getMaxDecimals,
} from "@/src/features/models/utils";

export function PricePreview({
  prices,
  monthlyUsageEstimate,
  monthlyBudget,
}: {
  prices: Record<string, number | undefined>;
  monthlyUsageEstimate?: Record<string, number | undefined>;
  monthlyBudget?: number;
}) {
  const parsedPrices = PriceMapSchema.safeParse(prices);
  const estimate = parsedPrices.success
    ? calculateModelPriceEstimate({
        prices: parsedPrices.data,
        usageEstimate: monthlyUsageEstimate,
      })
    : null;
  const showEstimate =
    estimate != null &&
    (estimate.lines.length > 0 || estimate.missingUsageTypes.length > 0);
  const exceedsBudget =
    monthlyBudget != null &&
    estimate != null &&
    estimate.totalCost.greaterThan(monthlyBudget);

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

            {estimate && showEstimate && (
              <div className="border-border mt-4 border-t pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h5 className="text-muted-foreground text-xs font-medium">
                    Monthly estimate
                  </h5>
                  <span
                    className={
                      exceedsBudget
                        ? "text-destructive font-mono text-xs font-semibold"
                        : "font-mono text-xs font-semibold"
                    }
                  >
                    {formatUsdEstimate(estimate.totalCost)}
                  </span>
                </div>

                {estimate.lines.length > 0 && (
                  <div className="space-y-1">
                    {estimate.lines.map((line) => (
                      <div
                        key={line.usageType}
                        className="text-muted-foreground grid grid-cols-[2fr_1fr_1fr] gap-2 text-xs"
                      >
                        <span className="truncate">{line.usageType}</span>
                        <span className="text-right font-mono">
                          {line.usageUnits.toLocaleString()}
                        </span>
                        <span className="text-right font-mono">
                          {formatUsdEstimate(line.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {monthlyBudget != null && (
                  <div
                    className={
                      exceedsBudget
                        ? "text-destructive mt-2 text-xs"
                        : "text-muted-foreground mt-2 text-xs"
                    }
                  >
                    Budget: {formatUsdEstimate(monthlyBudget)}
                  </div>
                )}

                {estimate.missingUsageTypes.length > 0 && (
                  <div className="text-muted-foreground mt-2 text-xs">
                    No configured price for{" "}
                    {estimate.missingUsageTypes.join(", ")}
                  </div>
                )}
              </div>
            )}
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
