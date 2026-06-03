import { auditLog } from "@/src/features/audit-logs/auditLog";
import { throwIfNoProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";
import {
  BATCH_EXPORT_RETENTION_MS,
  BatchExportStatus,
  CreateBatchExportSchema,
  getBatchExportExpiresAt,
  paginationZod,
} from "@langfuse/shared";
import {
  BatchExportQueue,
  logger,
  QueueJobs,
} from "@langfuse/shared/src/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertLegacyTracingIoSearchCanCreateBatchJob } from "@/src/features/traces/server/legacyIoSearch";

export const batchExportRouter = createTRPCRouter({
  create: protectedProjectProcedure
    .input(CreateBatchExportSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check permissions, esp. projectId
        throwIfNoProjectAccess({
          session: ctx.session,
          projectId: input.projectId,
          scope: "batchExports:create",
        });

        const { projectId, query, format, name } = input;
        assertLegacyTracingIoSearchCanCreateBatchJob({
          searchQuery: query.searchQuery,
          searchType: query.searchType,
          tableName: query.tableName,
        });

        logger.info("[BATCH EXPORT] Creating export job", { job: input });
        const userId = ctx.session.user.id;

        // Create export job
        const exportJob = await ctx.prisma.batchExport.create({
          data: {
            projectId,
            userId,
            status: BatchExportStatus.QUEUED,
            name,
            format,
            query,
          },
        });

        // Create audit log
        await auditLog({
          session: ctx.session,
          resourceType: "batchExport",
          resourceId: exportJob.id,
          projectId,
          action: "create",
          after: exportJob,
        });

        // Notify worker
        await BatchExportQueue.getInstance()?.add(QueueJobs.BatchExportJob, {
          id: exportJob.id, // Use the batchExportId to deduplicate when the same job is sent multiple times
          name: QueueJobs.BatchExportJob,
          timestamp: new Date(),
          payload: {
            batchExportId: exportJob.id,
            projectId,
          },
        });
      } catch (e) {
        logger.error("[BATCH EXPORT] Failed to create export job", e);
        if (e instanceof TRPCError) {
          throw e;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Creating export job failed.",
        });
      }
    }),
  cancel: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        batchExportId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "batchExports:create",
      });

      await ctx.prisma.batchExport.update({
        where: { id: input.batchExportId, projectId: input.projectId },
        data: { status: BatchExportStatus.CANCELLED },
      });
    }),
  all: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        ...paginationZod,
      }),
    )
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "batchExports:read",
      });

      const [exports, totalCount] = await Promise.all([
        ctx.prisma.batchExport.findMany({
          where: {
            projectId: input.projectId,
          },
          take: input.limit,
          skip: input.page * input.limit,
          orderBy: {
            createdAt: "desc",
          },
        }),
        ctx.prisma.batchExport.count({
          where: {
            projectId: input.projectId,
          },
        }),
      ]);

      // Look up users for each export
      const userIds = [...new Set(exports.map((e) => e.userId))];
      const users = await ctx.prisma.user.findMany({
        where: {
          id: {
            in: userIds,
          },
          organizationMemberships: {
            some: {
              organization: {
                projects: {
                  some: {
                    id: input.projectId,
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          image: true,
        },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      const now = new Date().getTime();
      const exportsWithExpiration = exports.map((e) => {
        const { finishedAt, url, ...rest } = e;

        let isExpired = false;
        let expiresAt = e.expiresAt;
        let timeToExpireMs: number | null = null;
        if (finishedAt) {
          const finishTime = new Date(finishedAt).getTime();
          expiresAt = getBatchExportExpiresAt(new Date(finishedAt));
          timeToExpireMs = finishTime + BATCH_EXPORT_RETENTION_MS - now;
          isExpired = now - finishTime > BATCH_EXPORT_RETENTION_MS;
        }

        return {
          ...rest,
          finishedAt,
          expiresAt,
          isExpired,
          timeToExpireMs,
          downloadAvailable: Boolean(url) && !isExpired,
          url: isExpired ? "expired" : url,
          user: userMap.get(e.userId) ?? null,
        };
      });
      const summary = {
        queued: exportsWithExpiration.filter(
          (batchExport) => batchExport.status === BatchExportStatus.QUEUED,
        ).length,
        processing: exportsWithExpiration.filter(
          (batchExport) => batchExport.status === BatchExportStatus.PROCESSING,
        ).length,
        completed: exportsWithExpiration.filter(
          (batchExport) => batchExport.status === BatchExportStatus.COMPLETED,
        ).length,
        expired: exportsWithExpiration.filter(
          (batchExport) => batchExport.isExpired,
        ).length,
        downloadable: exportsWithExpiration.filter(
          (batchExport) => batchExport.downloadAvailable,
        ).length,
      };

      return {
        exports: exportsWithExpiration,
        totalCount,
        summary,
      };
    }),
});
