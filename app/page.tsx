import { MockuperWorkspace } from "@/components/mockuper-workspace";
import { getUploadLimitsCached } from "@/lib/get-upload-limits-cached";

export default async function Page() {
  const initialLimits = await getUploadLimitsCached();
  return <MockuperWorkspace initialLimits={initialLimits} />;
}
