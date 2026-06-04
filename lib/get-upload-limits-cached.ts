import { cacheLife } from "next/cache";
import { getUploadLimitsResponse } from "./upload-limits";

export async function getUploadLimitsCached() {
  "use cache";
  cacheLife("minutes");
  return getUploadLimitsResponse();
}
