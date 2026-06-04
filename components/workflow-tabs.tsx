"use client";

import { FileText, Sparkles } from "lucide-react";
import type { Workflow } from "@/types";

type WorkflowTabsProps = {
  workflow: Workflow;
  onSwitch: (workflow: Workflow) => void;
};

function WorkflowTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

export function WorkflowTabs({ workflow, onSwitch }: WorkflowTabsProps) {
  return (
    <section className="bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800/80">
      <div className="flex flex-wrap gap-2 mb-4">
        <WorkflowTab
          active={workflow === "mockup"}
          onClick={() => onSwitch("mockup")}
          label="Mockup swap"
        />
        <WorkflowTab
          active={workflow === "product_edit"}
          onClick={() => onSwitch("product_edit")}
          label="Product edit"
        />
      </div>
      {workflow === "mockup" ? (
        <>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 border border-blue-500/20 rounded-full text-xs font-semibold text-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Product Mockup Replacer
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-4">
            Swap the dummy product for your real product
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3 max-w-2xl">
            Upload your product and a mockup scene — optionally add swap notes. AI uses both images
            (and your notes when provided) to write the Bria instruction — generate instruction
            only, or run the full pipeline with Nano Banana 2.
          </p>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/15 border border-violet-500/20 rounded-full text-xs font-semibold text-violet-200">
            <FileText className="w-3.5 h-3.5 text-violet-300" />
            Product Edit
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-4">
            Edit your product image with natural-language instructions
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3 max-w-2xl">
            Upload a product photo, optional reference images, and describe what to change. AI uses
            your references and notes to write a Bria instruction that preserves the product&apos;s
            color, shape, material, and texture — then Nano Banana 2 applies only your requested
            edits.
          </p>
        </>
      )}
    </section>
  );
}
