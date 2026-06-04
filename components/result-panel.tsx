"use client";

import { AlertCircle, Clock, Download, Maximize2 } from "lucide-react";
import { FeedbackForm } from "@/components/feedback-form";
import { CompareThumb } from "@/components/ui/compare-thumb";
import type { GenerateMode, MockupResult, Workflow } from "@/types";

type ResultPanelProps = {
  workflow: Workflow;
  generateMode: GenerateMode;
  result: MockupResult;
  productPreview: string | null;
  mockupPreview: string | null;
  onExpandImage: (url: string) => void;
  onFeedbackSubmitted: () => void;
};

export function ResultPanel({
  workflow,
  generateMode,
  result,
  productPreview,
  mockupPreview,
  onExpandImage,
  onFeedbackSubmitted,
}: ResultPanelProps) {
  const statusSubtitle = result.loading
    ? generateMode === "instruction_only"
      ? "Writing Bria instruction…"
      : "Bria instruction, then Nano Banana 2…"
    : result.imageUrl
      ? result.workflow === "product_edit"
        ? "Instruction + edited image (Nano Banana 2)"
        : "Instruction + mockup (Nano Banana 2)"
      : result.instruction
        ? "Bria instruction ready"
        : workflow === "product_edit"
          ? "Upload a product and add edit instructions"
          : "Upload both images and generate";

  const emptyMessage =
    workflow === "mockup"
      ? "Upload both images and generate"
      : "Upload a product image, add edit instructions, and generate";

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Result</h3>
          <p className="text-[10px] text-slate-400">{statusSubtitle}</p>
        </div>
        {result.elapsedTime !== null && !result.loading && (
          <span className="text-[11px] font-mono bg-blue-50 text-blue-700 font-semibold border border-blue-100 px-2 py-1 rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {result.elapsedTime}s
          </span>
        )}
      </div>

      <div className="p-6 min-h-[320px] flex items-center justify-center bg-slate-50/30 relative">
        {result.loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-4 z-10">
            <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-800">
                {generateMode === "instruction_only"
                  ? "Building Bria instruction…"
                  : "Building Bria instruction, then Nano Banana 2…"}
              </p>
              <p className="text-xs font-mono text-blue-600 mt-1">{result.elapsedTime}s</p>
            </div>
          </div>
        )}

        {!result.loading && result.error && (
          <div className="text-center space-y-3 p-4 bg-rose-50 border border-rose-100 rounded-xl max-w-md">
            <AlertCircle className="w-7 h-7 mx-auto text-rose-500" />
            <p className="text-sm font-bold text-rose-800">Generation failed</p>
            <p className="text-xs text-rose-600 leading-relaxed">{result.error}</p>
          </div>
        )}

        {!result.loading && !result.error && !result.imageUrl && !result.instruction && (
          <p className="text-sm text-slate-400">{emptyMessage}</p>
        )}

        {!result.loading && !result.error && (result.imageUrl || result.instruction) && (
          <div className="w-full max-w-2xl space-y-4">
            {result.imageUrl && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-sm">
                <img
                  src={result.imageUrl}
                  alt={result.workflow === "product_edit" ? "Edited product" : "Generated mockup"}
                  className="w-full object-contain max-h-[420px]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (result.imageUrl) {
                        onExpandImage(result.imageUrl);
                      }
                    }}
                    className="p-2 rounded-lg bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                    title="Expand preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <a
                    href={result.imageUrl}
                    download={
                      result.workflow === "product_edit"
                        ? "product-edit-result.png"
                        : "mockup-result.png"
                    }
                    className="p-2 rounded-lg bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {result.instruction && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Bria instruction
                </p>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {result.instruction}
                </p>
              </div>
            )}

            {productPreview &&
              (workflow === "mockup" && mockupPreview ? (
                <div className="grid grid-cols-2 gap-4">
                  <CompareThumb label="Original mockup" src={mockupPreview} />
                  <CompareThumb label="Your product" src={productPreview} />
                </div>
              ) : result.imageUrl ? (
                <div className="grid grid-cols-2 gap-4">
                  <CompareThumb label="Original product" src={productPreview} />
                  <CompareThumb label="Edited result" src={result.imageUrl} />
                </div>
              ) : (
                <CompareThumb label="Original product" src={productPreview} />
              ))}
          </div>
        )}
      </div>

      {!result.loading && result.usageId && (
        <div key={result.usageId}>
          <FeedbackForm
            usageId={result.usageId}
            generatedImageUrl={result.imageUrl}
            submitted={result.feedbackSubmitted}
            onSubmitted={onFeedbackSubmitted}
          />
        </div>
      )}
    </section>
  );
}
