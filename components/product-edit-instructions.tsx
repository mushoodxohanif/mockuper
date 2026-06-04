"use client";

type ProductEditInstructionsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ProductEditInstructions({ value, onChange }: ProductEditInstructionsProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center font-bold text-xs">
            2
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Edit instructions</h3>
        </div>
        <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold">
          REQUIRED
        </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Add credit cards and some cash inside the open wallet. Keep the wallet exactly as it is — same color, leather texture, shape, and stitching."
        rows={8}
        className="flex-1 min-h-[220px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-y"
      />
      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Describe only what should change. The Bria instruction will lock the product&apos;s
        intrinsic properties (color, shape, material, texture) unless you explicitly ask to change
        them.
      </p>
    </div>
  );
}
