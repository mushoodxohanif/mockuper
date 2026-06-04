/** Vercel serverless functions reject request bodies over 4.5 MB (not configurable). */
const VERCEL_PLATFORM_BODY_LIMIT = 4.5 * 1024 * 1024;

const SELF_HOSTED_MAX_FILE = 20 * 1024 * 1024;

/** Per-file cap on Vercel (two images + multipart overhead must stay under 4.5 MB). */
const VERCEL_MAX_FILE = 2 * 1024 * 1024;

function parseEnvBytes(name: string): number | undefined {
  const raw = process.env[name];
  if (raw == null || raw === "") {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function isVercelDeployment(): boolean {
  return process.env.VERCEL === "1";
}

export function getMaxFileSizeBytes(): number {
  return (
    parseEnvBytes("MAX_FILE_SIZE_BYTES") ??
    (isVercelDeployment() ? VERCEL_MAX_FILE : SELF_HOSTED_MAX_FILE)
  );
}

export function getMaxTotalUploadBytes(): number {
  const override = parseEnvBytes("MAX_TOTAL_UPLOAD_BYTES");
  if (override != null) {
    return override;
  }
  if (isVercelDeployment()) {
    return Math.floor(VERCEL_PLATFORM_BODY_LIMIT * 0.9);
  }
  return getMaxFileSizeBytes() * 2;
}

export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)}` : mb.toFixed(1);
}

export type UploadLimitsResponse = {
  maxFileSizeBytes: number;
  maxTotalUploadBytes: number;
  hostedOnVercel: boolean;
  maxFileSizeLabel: string;
  maxTotalUploadLabel: string;
};

export function getUploadLimitsResponse(): UploadLimitsResponse {
  const maxFileSizeBytes = getMaxFileSizeBytes();
  const maxTotalUploadBytes = getMaxTotalUploadBytes();

  return {
    maxFileSizeBytes,
    maxTotalUploadBytes,
    hostedOnVercel: isVercelDeployment(),
    maxFileSizeLabel: `${formatMegabytes(maxFileSizeBytes)} MB`,
    maxTotalUploadLabel: `${formatMegabytes(maxTotalUploadBytes)} MB`,
  };
}

/** Per-file byte budget so multiple images stay under the total request cap. */
export function getPerFileUploadBudget(fileCount: number): number {
  const maxFile = getMaxFileSizeBytes();
  const maxTotal = getMaxTotalUploadBytes();
  if (fileCount <= 1) {
    return Math.min(maxFile, maxTotal);
  }
  return Math.min(maxFile, Math.floor(maxTotal / fileCount));
}
