import {
  formatMegabytes,
  getMaxFileSizeBytes,
  getMaxTotalUploadBytes,
  isVercelDeployment,
} from "../lib/upload-limits.js";

export function GET() {
  const maxFileSizeBytes = getMaxFileSizeBytes();
  const maxTotalUploadBytes = getMaxTotalUploadBytes();

  return Response.json({
    maxFileSizeBytes,
    maxTotalUploadBytes,
    hostedOnVercel: isVercelDeployment(),
    maxFileSizeLabel: `${formatMegabytes(maxFileSizeBytes)} MB`,
    maxTotalUploadLabel: `${formatMegabytes(maxTotalUploadBytes)} MB`,
  });
}
