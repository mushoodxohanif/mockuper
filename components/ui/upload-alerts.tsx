import { AlertCircle, CheckCircle } from "lucide-react";
import type { UploadLimits } from "@/types";

type UploadAlertsProps = {
  uploadLimits: UploadLimits;
  compressingUpload: boolean;
  compressionNotice: string | null;
  uploadError: string | null;
};

export function UploadAlerts({
  uploadLimits,
  compressingUpload,
  compressionNotice,
  uploadError,
}: UploadAlertsProps) {
  return (
    <>
      {uploadLimits.hostedOnVercel && (
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          Large photos are automatically compressed to {uploadLimits.maxFileSizeLabel} each (
          {uploadLimits.maxTotalUploadLabel} combined) before upload.
        </p>
      )}

      {compressingUpload && (
        <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          Compressing image for upload…
        </p>
      )}

      {compressionNotice && !compressingUpload && (
        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {compressionNotice}
        </p>
      )}

      {uploadError && (
        <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {uploadError}
        </p>
      )}
    </>
  );
}
