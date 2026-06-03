import { PlusCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { Accordion } from "@/src/components/ui/accordion";
import { TierAccordionItem } from "./TierAccordionItem";
import { TierPriceEditor } from "./TierPriceEditor";
import { TierPrefillButtons } from "./TierPrefillButtons";
import type {
  FieldPath,
  UseFormReturn,
  UseFieldArrayReturn,
} from "react-hook-form";
import type { FormUpsertModel } from "../../validation";
import { PricePreview } from "../PricePreview";

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
  const monthlyBudget = form.watch("monthlyBudget");
  const monthlyUsageEstimate = form.watch("monthlyUsageEstimate") ?? {};
  const monthlyUsageEntries = Object.entries(monthlyUsageEstimate);

  const updateMonthlyUsage = (usageType: string, value: number) => {
    form.setValue(
      `monthlyUsageEstimate.${usageType}` as FieldPath<FormUpsertModel>,
      value,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  };

  const addMonthlyUsageType = () => {
    const nextKey = `custom_${monthlyUsageEntries.length + 1}`;
    form.setValue(
      `monthlyUsageEstimate.${nextKey}` as FieldPath<FormUpsertModel>,
      0,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  };

  const removeMonthlyUsageType = (usageType: string) => {
    const nextEstimate = { ...monthlyUsageEstimate };
    delete nextEstimate[usageType];
    form.setValue("monthlyUsageEstimate", nextEstimate, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

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
        <TierPriceEditor
          tierIndex={defaultTierIndex}
          form={form}
          isDefault={true}
        />
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <FormLabel>Monthly estimate</FormLabel>
            <FormDescription>
              Enter expected monthly usage to preview this model&apos;s
              estimated cost.
            </FormDescription>
          </div>

          <FormField
            control={form.control}
            name="monthlyBudget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly budget</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Optional budget in USD"
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <div className="text-muted-foreground text-sm">
              Expected monthly usage
            </div>
            {monthlyUsageEntries.map(([usageType, value]) => (
              <div
                key={usageType}
                className="grid grid-cols-[1fr_1fr_auto] gap-2"
              >
                <Input value={usageType} disabled />
                <Input
                  type="number"
                  min={0}
                  value={value ?? 0}
                  onChange={(event) =>
                    updateMonthlyUsage(usageType, Number(event.target.value))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMonthlyUsageType(usageType)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addMonthlyUsageType}>
              Add usage estimate
            </Button>
          </div>

          <PricePreview
            prices={defaultTierPrices}
            monthlyUsageEstimate={monthlyUsageEstimate}
            monthlyBudget={monthlyBudget}
          />
        </div>

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

      <Button type="button" variant="outline" onClick={addTier}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Custom Tier
      </Button>

      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <FormLabel>Monthly estimate</FormLabel>
          <FormDescription>
            Preview the expected monthly cost from the default tier prices.
          </FormDescription>
        </div>

        <FormField
          control={form.control}
          name="monthlyBudget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly budget</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={field.value ?? ""}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="text-muted-foreground text-sm">
            Expected monthly usage
          </div>
          {monthlyUsageEntries.map(([usageType, value]) => (
            <div
              key={usageType}
              className="grid grid-cols-[1fr_1fr_auto] gap-2"
            >
              <Input value={usageType} disabled />
              <Input
                type="number"
                min={0}
                value={value ?? 0}
                onChange={(event) =>
                  updateMonthlyUsage(usageType, Number(event.target.value))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeMonthlyUsageType(usageType)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addMonthlyUsageType}>
            Add usage estimate
          </Button>
        </div>

        <PricePreview
          prices={defaultTierPrices}
          monthlyUsageEstimate={monthlyUsageEstimate}
          monthlyBudget={monthlyBudget}
        />
      </div>
    </div>
  );
}
