import { LATEST_PROMPT_LABEL, PRODUCTION_LABEL } from "@langfuse/shared";

export const isReservedPromptLabel = (label: string) => {
  return [PRODUCTION_LABEL, LATEST_PROMPT_LABEL].includes(label);
};

export const PROMPT_DUPLICATE_SUFFIX = "-copy";

export type PromptNameOption = {
  value: string;
};

export type DuplicatePromptNameSummary = {
  suggestedName: string;
  normalizedName: string;
  hasCollision: boolean;
  promptCountInTargetFolder: number;
  folderDepth: number;
};

export type DuplicateFolderSummary = {
  normalizedSourcePath: string;
  normalizedTargetPath: string;
  promptCount: number;
  collisionCount: number;
  nestedPromptCount: number;
  rewrittenReferenceCount: number;
  previewNames: string[];
};

export const normalizePromptPath = (path: string) => {
  return path
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .trim();
};

export const splitPromptFolderPath = (name: string) => {
  const normalizedName = normalizePromptPath(name);
  const segments = normalizedName.split("/").filter(Boolean);
  const promptName = segments.pop() ?? "";

  return {
    folderPath: segments.join("/"),
    promptName,
    segments,
  };
};

export const buildDuplicatePromptName = ({
  promptName,
  existingNames,
  suffix = PROMPT_DUPLICATE_SUFFIX,
}: {
  promptName: string;
  existingNames?: PromptNameOption[];
  suffix?: string;
}) => {
  const normalizedPromptName = normalizePromptPath(promptName);
  const existing = new Set((existingNames ?? []).map((item) => item.value));
  let candidate = `${normalizedPromptName}${suffix}`;
  let counter = 2;

  while (existing.has(candidate)) {
    candidate = `${normalizedPromptName}${suffix}-${counter}`;
    counter += 1;
  }

  return candidate;
};

export const buildDuplicateFolderTargetPath = ({
  folderPath,
  existingNames,
  suffix = PROMPT_DUPLICATE_SUFFIX,
}: {
  folderPath: string;
  existingNames?: PromptNameOption[];
  suffix?: string;
}) => {
  const normalizedFolderPath = normalizePromptPath(folderPath);
  const existing = existingNames ?? [];
  let candidate = `${normalizedFolderPath}${suffix}`;
  let counter = 2;

  while (
    existing.some(
      ({ value }) => value === candidate || value.startsWith(`${candidate}/`),
    )
  ) {
    candidate = `${normalizedFolderPath}${suffix}-${counter}`;
    counter += 1;
  }

  return candidate;
};

export const summarizeDuplicatePromptName = ({
  promptName,
  targetName,
  existingNames,
}: {
  promptName: string;
  targetName: string;
  existingNames?: PromptNameOption[];
}): DuplicatePromptNameSummary => {
  const normalizedName = normalizePromptPath(targetName);
  const { folderPath, segments } = splitPromptFolderPath(normalizedName);
  const existing = existingNames ?? [];

  return {
    suggestedName: buildDuplicatePromptName({
      promptName,
      existingNames,
    }),
    normalizedName,
    hasCollision: existing.some(({ value }) => value === normalizedName),
    promptCountInTargetFolder: folderPath
      ? existing.filter(({ value }) => value.startsWith(`${folderPath}/`))
          .length
      : existing.filter(({ value }) => !value.includes("/")).length,
    folderDepth: segments.length,
  };
};

export const summarizeDuplicateFolder = ({
  sourcePath,
  targetPath,
  existingNames,
  rewritePromptReferences,
}: {
  sourcePath: string;
  targetPath: string;
  existingNames?: string[];
  rewritePromptReferences: boolean;
}): DuplicateFolderSummary => {
  const normalizedSourcePath = normalizePromptPath(sourcePath);
  const normalizedTargetPath = normalizePromptPath(targetPath);
  const sourcePrefix = `${normalizedSourcePath}/`;
  const targetPrefix = `${normalizedTargetPath}/`;
  const names = existingNames ?? [];
  const sourceNames = names.filter((name) => name.startsWith(sourcePrefix));
  const previewNames = sourceNames
    .slice(0, 5)
    .map(
      (name) =>
        `${normalizedTargetPath}${name.slice(normalizedSourcePath.length)}`,
    );

  return {
    normalizedSourcePath,
    normalizedTargetPath,
    promptCount: sourceNames.length,
    collisionCount: names.filter(
      (name) => name === normalizedTargetPath || name.startsWith(targetPrefix),
    ).length,
    nestedPromptCount: sourceNames.filter(
      (name) => name.slice(sourcePrefix.length).includes("/"),
    ).length,
    rewrittenReferenceCount: rewritePromptReferences ? sourceNames.length : 0,
    previewNames,
  };
};
