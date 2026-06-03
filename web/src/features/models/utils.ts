import Decimal from "decimal.js";

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

export type ModelPriceEstimateLine = {
  usageType: string;
  usageUnits: number;
  pricePerUnit: number;
  cost: Decimal;
};

export type ModelPriceEstimate = {
  lines: ModelPriceEstimateLine[];
  totalCost: Decimal;
  missingUsageTypes: string[];
  highestCostUsageType?: string;
};

export const normalizeUsageEstimate = (
  estimate: Record<string, number | undefined> | undefined,
) => {
  if (!estimate) return {};

  return Object.fromEntries(
    Object.entries(estimate)
      .map(([usageType, value]) => {
        const normalizedUsageType = usageType.trim();
        const normalizedValue = Number(value ?? 0);
        return [normalizedUsageType, normalizedValue] as const;
      })
      .filter(
        ([usageType, value]) =>
          usageType.length > 0 && Number.isFinite(value),
      ),
  ) as Record<string, number>;
};

export const calculateModelPriceEstimate = ({
  prices,
  usageEstimate,
}: {
  prices: Record<string, number | undefined>;
  usageEstimate: Record<string, number | undefined> | undefined;
}): ModelPriceEstimate => {
  const normalizedUsage = normalizeUsageEstimate(usageEstimate);
  const lines: ModelPriceEstimateLine[] = [];
  const missingUsageTypes: string[] = [];

  Object.entries(normalizedUsage).forEach(([usageType, usageUnits]) => {
    const configuredPrice =
      prices[usageType] ??
      prices[usageType.toLowerCase()] ??
      prices[usageType.toUpperCase()];

    if (configuredPrice == null) {
      missingUsageTypes.push(usageType);
      return;
    }

    const normalizedUnits = Math.max(1, usageUnits);
    const cost = new Decimal(configuredPrice).mul(normalizedUnits);

    lines.push({
      usageType,
      usageUnits: normalizedUnits,
      pricePerUnit: configuredPrice,
      cost,
    });
  });

  const totalCost = lines.reduce(
    (total, line) => total.plus(line.cost),
    new Decimal(0),
  );
  const highestCostLine = lines.reduce<ModelPriceEstimateLine | undefined>(
    (highest, line) =>
      !highest || line.cost.greaterThan(highest.cost) ? line : highest,
    undefined,
  );

  return {
    lines,
    totalCost,
    missingUsageTypes,
    highestCostUsageType: highestCostLine?.usageType,
  };
};

export const formatUsdEstimate = (value: Decimal | number) => {
  const decimalValue = new Decimal(value);

  if (decimalValue.greaterThanOrEqualTo(1000)) {
    return `$${decimalValue.toDecimalPlaces(0).toNumber().toLocaleString()}`;
  }

  if (decimalValue.greaterThanOrEqualTo(1)) {
    return `$${decimalValue.toFixed(2)}`;
  }

  return `$${decimalValue.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}`;
};
