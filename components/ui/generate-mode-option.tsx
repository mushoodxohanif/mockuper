"use client";

import type { ReactNode } from "react";

type GenerateModeOptionProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  icon: ReactNode;
  recommended?: boolean;
};

export function GenerateModeOption({
  selected,
  onSelect,
  title,
  description,
  icon,
  recommended = false,
}: GenerateModeOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
        selected
          ? "border-blue-500 bg-blue-50/50 shadow-sm"
          : "border-slate-200 hover:border-slate-300 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className={selected ? "text-blue-600" : "text-slate-500"}>{icon}</span>
        {title}
        {recommended && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
            Recommended
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
    </button>
  );
}
