import { PlusCircle } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import { FormDescription, FormLabel } from "@/src/components/ui/form";
import { Accordion } from "@/src/components/ui/accordion";
import { TierAccordionItem } from "./TierAccordionItem";
import { TierPriceEditor } from "./TierPriceEditor";
import { TierPrefillButtons } from "./TierPrefillButtons";
import {
  DEFAULT_SAMPLE_USAGE,
  estimateCostFromPrices,
  formatEstimatedCost,
} from "@/src/features/models/utils";
import type { UseFormReturn, UseFieldArrayReturn } from "react-hook-form";
import type { FormUpsertModel } from "../../validation";

type PricingSectionProps = {
  fields: UseFieldArrayReturn<FormUpsertModel, "pricingTiers">["fields"];
  form: UseFormReturn<FormUpsertModel>;
  remove: UseFieldArrayReturn<FormUpsertModel, "pricingTiers">["remove"];
  addTier: () => void;
};

export type { PricingSectionProps };

export function PricingSection({
  fields,
  form,
  remove,
  addTier,
}: PricingSectionProps) {
  const hasMultipleTiers = fields.length > 1;
  const defaultTierIndex = fields.findIndex((f) => f.isDefault);
  const defaultTierPrices =
    defaultTierIndex >= 0
      ? form.watch(`pricingTiers.${defaultTierIndex}.prices`)
      : {};
  const defaultTierEstimate = useMemo(() => {
    return estimateCostFromPrices(defaultTierPrices ?? {}, DEFAULT_SAMPLE_USAGE);
  }, [defaultTierPrices]);
  const customTierCount = fields.filter((field) => !field.isDefault).length;

  const pricingSummary = (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Sample cost estimate</div>
          <div className="text-muted-foreground text-xs">
            Based on 1,000 input units, 1,000 output units, and 2,000 total
            units.
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-semibold">
            {formatEstimatedCost(defaultTierEstimate)}
          </div>
          <div className="text-muted-foreground text-xs">
            {customTierCount} custom tier{customTierCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    </div>
  );

  if (!hasMultipleTiers) {
    // SIMPLE VIEW: Just show prices for the single default tier
    return (
      <div className="space-y-4">
        <div>
          <FormLabel>Prices</FormLabel>
          <FormDescription>
            Set prices per usage type for this model. Usage types must exactly
            match the keys of the ingested usage details.
          </FormDescription>
        </div>

        <TierPrefillButtons tierIndex={defaultTierIndex} form={form} />
        {pricingSummary}
        <TierPriceEditor
          tierIndex={defaultTierIndex}
          form={form}
          isDefault={true}
        />

        <Button type="button" variant="ghost" onClick={addTier}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Custom Pricing Tier
        </Button>
      </div>
    );
  }

  // ACCORDION VIEW: Multiple tiers
  return (
    <div className="space-y-4">
      <div>
        <FormLabel>Pricing Tiers</FormLabel>
        <FormDescription>
          Define pricing rules evaluated in priority order. Tiers are checked
          from top to bottom until conditions match.
        </FormDescription>
      </div>

      <Accordion
        type="multiple"
        defaultValue={fields.map((_, i) => `tier-${i}`)} // All expanded
        className="space-y-2"
      >
        {fields.map((field, index) => (
          <TierAccordionItem
            key={field.id}
            tier={field}
            index={index}
            form={form}
            remove={remove}
            isDefault={field.isDefault}
          />
        ))}
      </Accordion>

      {pricingSummary}

      <Button type="button" variant="outline" onClick={addTier}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Custom Tier
      </Button>
    </div>
  );
}
