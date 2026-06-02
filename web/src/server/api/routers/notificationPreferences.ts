import { z } from "zod";
import { NotificationChannel, NotificationType } from "@prisma/client";
import { throwIfNoProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";
import { auditLog } from "@/src/features/audit-logs/auditLog";

// Use enums from Prisma types to stay in sync with DB schema
const NotificationChannelEnum = z.enum(NotificationChannel);
const NotificationTypeEnum = z.enum(NotificationType);

const NotificationPreferenceInput = z.object({
  projectId: z.string(),
  channel: NotificationChannelEnum,
  type: NotificationTypeEnum,
  enabled: z.boolean(),
});

const NotificationPreferenceBatchInput = z.object({
  projectId: z.string(),
  preferences: z
    .array(
      z.object({
        channel: NotificationChannelEnum,
        type: NotificationTypeEnum,
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(20),
});

const GetPreferencesInput = z.object({
  projectId: z.string(),
});

const SUPPORTED_NOTIFICATION_PREFERENCES = [
  {
    channel: "EMAIL" as const,
    type: "COMMENT_MENTION" as const,
    label: "Comment mentions",
    description: "Email when someone mentions you in a comment.",
    defaultEnabled: true,
  },
];

const getPreferenceKey = (
  channel: NotificationChannel,
  type: NotificationType,
) => `${channel}:${type}`;

export const notificationPreferencesRouter = createTRPCRouter({
  getForProject: protectedProjectProcedure
    .input(GetPreferencesInput)
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });

      const userId = ctx.session.user.id;

      const storedPreferences =
        await ctx.prisma.notificationPreference.findMany({
          where: {
            userId,
            projectId: input.projectId,
            OR: SUPPORTED_NOTIFICATION_PREFERENCES.map((preference) => ({
              channel: preference.channel,
              type: preference.type,
            })),
          },
        });

      const storedPreferenceByKey = new Map(
        storedPreferences.map((preference) => [
          getPreferenceKey(preference.channel, preference.type),
          preference,
        ]),
      );

      return SUPPORTED_NOTIFICATION_PREFERENCES.map((preference) => {
        const storedPreference = storedPreferenceByKey.get(
          getPreferenceKey(preference.channel, preference.type),
        );

        return {
          channel: preference.channel,
          type: preference.type,
          label: preference.label,
          description: preference.description,
          enabled: storedPreference?.enabled ?? preference.defaultEnabled,
        };
      });
    }),

  getProjectSummary: protectedProjectProcedure
    .input(GetPreferencesInput)
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });

      const projectPreferences =
        await ctx.prisma.notificationPreference.findMany({
          where: {
            projectId: input.projectId,
            channel: "EMAIL",
          },
        });

      const enabledCount = projectPreferences.filter(
        (preference) => preference.enabled,
      ).length;
      const disabledCount = projectPreferences.length - enabledCount;
      const supportedTypes = SUPPORTED_NOTIFICATION_PREFERENCES.length;

      return {
        enabledCount,
        disabledCount,
        configuredCount: projectPreferences.length,
        supportedTypes,
      };
    }),

  resetForProject: protectedProjectProcedure
    .input(GetPreferencesInput)
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });

      const userId = ctx.session.user.id;
      const deleted = await ctx.prisma.notificationPreference.deleteMany({
        where: {
          userId,
          projectId: input.projectId,
        },
      });

      await auditLog({
        session: ctx.session,
        resourceType: "notificationPreference",
        resourceId: input.projectId,
        action: "delete",
        before: undefined,
        after: { deletedCount: deleted.count },
      });

      return { deletedCount: deleted.count };
    }),

  update: protectedProjectProcedure
    .input(NotificationPreferenceInput)
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });

      const userId = ctx.session.user.id;

      // Fetch existing preference for audit log
      const before = await ctx.prisma.notificationPreference.findUnique({
        where: {
          userId_projectId_channel_type: {
            userId,
            projectId: input.projectId,
            channel: input.channel,
            type: input.type,
          },
        },
      });

      // Upsert the preference
      const preference = await ctx.prisma.notificationPreference.upsert({
        where: {
          userId_projectId_channel_type: {
            userId,
            projectId: input.projectId,
            channel: input.channel,
            type: input.type,
          },
        },
        update: {
          enabled: input.enabled,
        },
        create: {
          userId,
          projectId: input.projectId,
          channel: input.channel,
          type: input.type,
          enabled: input.enabled,
        },
      });

      await auditLog({
        session: ctx.session,
        resourceType: "notificationPreference",
        resourceId: preference.id,
        action: before ? "update" : "create",
        before: before ?? undefined,
        after: preference,
      });

      return preference;
    }),

  updateMany: protectedProjectProcedure
    .input(NotificationPreferenceBatchInput)
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });

      const userId = ctx.session.user.id;
      const updatedPreferences = [];

      for (const preferenceInput of input.preferences) {
        const preference = await ctx.prisma.notificationPreference.upsert({
          where: {
            userId_projectId_channel_type: {
              userId,
              projectId: input.projectId,
              channel: preferenceInput.channel,
              type: preferenceInput.type,
            },
          },
          update: {
            enabled: preferenceInput.enabled,
          },
          create: {
            userId,
            projectId: input.projectId,
            channel: preferenceInput.channel,
            type: preferenceInput.type,
            enabled: preferenceInput.enabled,
          },
        });

        updatedPreferences.push(preference);
      }

      await auditLog({
        session: ctx.session,
        resourceType: "notificationPreference",
        resourceId: input.projectId,
        action: "update",
        before: undefined,
        after: updatedPreferences,
      });

      return updatedPreferences;
    }),
});
