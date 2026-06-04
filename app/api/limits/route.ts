import { getUploadLimitsResponse } from "@/lib/upload-limits";

export function GET() {
  return Response.json(getUploadLimitsResponse());
}
