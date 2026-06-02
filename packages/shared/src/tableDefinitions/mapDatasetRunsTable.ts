import { UiColumnMappings } from "./types";

export const datasetRunsTableUiColumnDefinitions: UiColumnMappings = [
  {
    uiTableName: "Dataset Run ID",
    uiTableId: "id",
    clickhouseTableName: "dataset_run_items_rmt",
    clickhouseSelect: "drm.dataset_run_id",
  },
  {
    uiTableName: "Created At",
    uiTableId: "createdAt",
    clickhouseTableName: "dataset_run_items_rmt",
    clickhouseSelect: "drm.dataset_run_created_at",
  },
  {
    uiTableName: "Run Item Coverage",
    uiTableId: "coveragePercent",
    clickhouseTableName: "dataset_run_items_rmt",
    clickhouseSelect: "drm.coverage_percent",
  },
  {
    uiTableName: "Trace Count",
    uiTableId: "traceCount",
    clickhouseTableName: "dataset_run_items_rmt",
    clickhouseSelect: "drm.trace_count",
  },
  {
    uiTableName: "Observation Count",
    uiTableId: "observationCount",
    clickhouseTableName: "dataset_run_items_rmt",
    clickhouseSelect: "drm.observation_count",
  },
  {
    uiTableName: "Scores (numeric)",
    uiTableId: "agg_scores_avg",
    clickhouseTableName: "dataset_run_items_rmt",
    clickhouseSelect: "sa.scores_avg",
  },
  {
    uiTableName: "Scores (categorical)",
    uiTableId: "agg_score_categories",
    clickhouseTableName: "dataset_run_items_rmt",
    clickhouseSelect: "sa.score_categories",
  },
];
