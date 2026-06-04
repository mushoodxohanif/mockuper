"use client";

import { FileText, Info, Play, Sparkles } from "lucide-react";
import { GenerateModeOption } from "@/components/ui/generate-mode-option";
import type { GenerateMode, Workflow } from "@/types";

type GenerationControlsProps = {
  workflow: Workflow;
  generateMode: GenerateMode;
  canGenerate: boolean;
  onModeChange: (mode: GenerateMode) => void;
  onGenerate: () => void;
};

export function GenerationControls({
  workflow,
  generateMode,
  canGenerate,
  onModeChange,
  onGenerate,
}: GenerationControlsProps) {
  const accentButton =
    workflow === "mockup"
      ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
      : "bg-violet-600 hover:bg-violet-700 cursor-pointer";

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-900 text-sm">What to generate</h4>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            {workflow === "mockup" ? (
              <>
                <strong>Instruction only</strong> — Gemini writes the Bria instruction from your two
                images and optional swap notes (copy it to gemini.google.com if you like).{" "}
                <strong>Instruction + image</strong> — same instruction, then Nano Banana 2 renders
                the final mockup.
              </>
            ) : (
              <>
                <strong>Instruction only</strong> — Gemini writes a preservation-aware Bria
                instruction from your product photo, optional reference images, and edit notes.{" "}
                <strong>Instruction + image</strong> — same instruction, then Nano Banana 2 edits
                the product image.
              </>
            )}{" "}
            Requires <code className="text-[11px]">GEMINI_API_KEY</code>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <GenerateModeOption
          selected={generateMode === "instruction_only"}
          onSelect={() => onModeChange("instruction_only")}
          title="Instruction only"
          description={
            workflow === "mockup"
              ? "Bria instruction from both images (optional swap notes) — no render."
              : "Bria instruction from product + your edit notes — no render."
          }
          icon={<FileText className="w-4 h-4" />}
        />
        <GenerateModeOption
          selected={generateMode === "full"}
          onSelect={() => onModeChange("full")}
          title={workflow === "mockup" ? "Instruction + mockup" : "Instruction + image"}
          description="Bria instruction, then Nano Banana 2 final image."
          icon={<Sparkles className="w-4 h-4" />}
          recommended
        />
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate}
        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-semibold rounded-xl text-white shadow-md transition-all ${
          canGenerate ? accentButton : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
      >
        <Play className="w-4 h-4 fill-current" />
        {generateMode === "instruction_only"
          ? "Generate instruction"
          : workflow === "mockup"
            ? "Generate instruction + mockup"
            : "Generate instruction + image"}
      </button>
    </section>
  );
}
