import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "@/src/utils/api";
import Header from "@/src/components/layouts/header";
import { Card, CardContent } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Switch } from "@/src/components/ui/switch";
import { Button } from "@/src/components/ui/button";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";

type NotificationSettingsProps = {
  projectId?: string;
};

const SummaryTile = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-lg border bg-muted/20 px-4 py-3">
    <div className="text-muted-foreground text-xs">{label}</div>
    <div className="mt-1 text-lg font-semibold">{value}</div>
  </div>
);

export function NotificationSettings(props: NotificationSettingsProps) {
  const router = useRouter();
  const projectId = props.projectId ?? (router.query.projectId as string);
  const [isSaving, setIsSaving] = useState(false);
  const [savingPreference, setSavingPreference] = useState<string | null>(null);

  const hasAccess = useHasProjectAccess({
    projectId,
    scope: "project:read",
  });

  const {
    data: preferences,
    isLoading,
    refetch,
  } = api.notificationPreferences.getForProject.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );

  const { data: summary, refetch: refetchSummary } =
    api.notificationPreferences.getProjectSummary.useQuery(
      { projectId },
      { enabled: Boolean(projectId) },
    );

  const updatePreference = api.notificationPreferences.update.useMutation({
    onSuccess: () => {
      refetch();
      refetchSummary();
    },
  });

  const updateManyPreferences =
    api.notificationPreferences.updateMany.useMutation({
      onSuccess: () => {
        refetch();
        refetchSummary();
      },
    });

  const resetPreferences =
    api.notificationPreferences.resetForProject.useMutation({
      onSuccess: () => {
        refetch();
        refetchSummary();
      },
    });

  const handleToggle = async (
    preference: NonNullable<typeof preferences>[number],
    enabled: boolean,
  ) => {
    setIsSaving(true);
    setSavingPreference(`${preference.channel}:${preference.type}`);
    try {
      await updatePreference.mutateAsync({
        projectId,
        channel: preference.channel,
        type: preference.type,
        enabled,
      });
      showSuccessToast({
        title: "Notification preference updated",
        description: `${preference.label} notifications are now ${
          enabled ? "enabled" : "disabled"
        }.`,
      });
    } catch (error) {
      showErrorToast(
        "Failed to update notification preference",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSavingPreference(null);
      setIsSaving(false);
    }
  };

  const handleBulkUpdate = async (enabled: boolean) => {
    if (!preferences) return;

    setIsSaving(true);
    try {
      await updateManyPreferences.mutateAsync({
        projectId,
        preferences: preferences.map((preference) => ({
          channel: preference.channel,
          type: preference.type,
          enabled,
        })),
      });
      showSuccessToast({
        title: enabled ? "Notifications enabled" : "Notifications disabled",
        description: enabled
          ? "All email notifications have been enabled."
          : "All email notifications have been disabled.",
      });
    } catch (error) {
      showErrorToast(
        "Failed to update notification preferences",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await resetPreferences.mutateAsync({ projectId });
      showSuccessToast({
        title: "Notification preferences reset",
        description: "Email notifications now use the project defaults.",
      });
    } catch (error) {
      showErrorToast(
        "Failed to reset notification preferences",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !preferences) {
    return (
      <div>
        <Header title="Notification Settings" />
        <Card className="mt-4">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">
              Loading preferences...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const enabledPreferences = preferences.filter((preference) => {
    return preference.enabled;
  });
  const disabledPreferences = preferences.length - enabledPreferences.length;

  return (
    <div>
      <Header title="Notification Settings" />
      <Card className="mt-4">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-medium">Email Notifications</h3>
              <p className="text-muted-foreground text-sm">
                Manage your email notification preferences for this project.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving || !hasAccess}
                onClick={() => handleBulkUpdate(true)}
              >
                Enable all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving || !hasAccess}
                onClick={() => handleBulkUpdate(false)}
              >
                Disable all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSaving || !hasAccess}
                onClick={handleReset}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryTile label="Enabled" value={enabledPreferences.length} />
            <SummaryTile label="Disabled" value={disabledPreferences} />
            <SummaryTile
              label="Configured"
              value={summary?.configuredCount ?? 0}
            />
            <SummaryTile
              label="Supported"
              value={summary?.supportedTypes ?? preferences.length}
            />
          </div>

          <div className="space-y-4">
            {preferences.map((preference) => {
              const preferenceId = `${preference.channel}-${preference.type}`;
              const isPreferenceSaving =
                savingPreference === `${preference.channel}:${preference.type}`;

              return (
                <div
                  key={preferenceId}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={preferenceId} className="text-base">
                      {preference.label}
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      {preference.description}
                    </p>
                  </div>
                  <Switch
                    id={preferenceId}
                    checked={preference.enabled}
                    onCheckedChange={(enabled) =>
                      handleToggle(preference, enabled)
                    }
                    disabled={isSaving || isPreferenceSaving || !hasAccess}
                  />
                </div>
              );
            })}
            {preferences.length === 0 && (
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">
                  No notification preferences are available for this project.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(updatePreference.isError ||
        updateManyPreferences.isError ||
        resetPreferences.isError) && (
        <div className="border-destructive bg-destructive/10 mt-4 rounded-lg border p-4">
          <p className="text-destructive text-sm">
            Failed to update notification preference. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
