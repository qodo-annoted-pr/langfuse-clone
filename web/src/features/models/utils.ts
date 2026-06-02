import Decimal from "decimal.js";
import type { SampleUsage } from "./validation";

export const DEFAULT_SAMPLE_USAGE: SampleUsage = {
  input: 1000,
  output: 1000,
  total: 2000,
};

export const getMaxDecimals = (
  value: number | undefined,
  scaleMultiplier: number = 1,
) => {
  return (
    new Decimal(value ?? 0)
      .mul(scaleMultiplier)
      .toFixed(12)
      .split(".")[1]
      ?.replace(/0+$/, "").length ?? 0
  );
};

export const normalizeSampleUsage = (
  usage?: Partial<Record<string, number>>,
): SampleUsage => {
  return {
    input: Math.max(0, Math.round(usage?.input ?? DEFAULT_SAMPLE_USAGE.input)),
    output: Math.max(
      0,
      Math.round(usage?.output ?? DEFAULT_SAMPLE_USAGE.output),
    ),
    total: Math.max(0, Math.round(usage?.total ?? DEFAULT_SAMPLE_USAGE.total)),
  };
};

export const estimateCostFromPrices = (
  prices: Record<string, number | undefined>,
  usage: SampleUsage = DEFAULT_SAMPLE_USAGE,
) => {
  return Object.entries(prices).reduce((sum, [usageType, price]) => {
    if (price == null || Number.isNaN(price)) return sum;

    const usageCount =
      usage[usageType as keyof SampleUsage] ??
      (usageType.toLowerCase().includes("input")
        ? usage.input
        : usageType.toLowerCase().includes("output")
          ? usage.output
          : usage.total);

    return sum.plus(new Decimal(price).mul(usageCount));
  }, new Decimal(0));
};

export const formatEstimatedCost = (value: Decimal) => {
  const numericValue = value.toNumber();

  if (numericValue === 0) return "$0.00";
  if (numericValue < 0.01) return `$${value.toFixed(6)}`;

  return `$${value.toFixed(4)}`;
};
