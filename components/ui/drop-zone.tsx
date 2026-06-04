"use client";

import { CheckCircle, Trash2 } from "lucide-react";
import type { DragEvent, ReactNode, RefObject } from "react";

type DropZoneProps = {
  step: string;
  title: string;
  badge?: string;
  accent?: "blue" | "violet";
  compressing: boolean;
  preview: string | null;
  file: File | null;
  dragActive: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (file: File) => void;
  onBrowse: () => void;
  onClear: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (file: File) => void;
  icon: ReactNode;
};

export function DropZone({
  step,
  title,
  badge = "REQUIRED",
  accent = "blue",
  compressing,
  preview,
  file,
  dragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowse,
  onClear,
  inputRef,
  onChange,
  icon,
}: DropZoneProps) {
  const stepBg = accent === "violet" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700";
  const dragActiveClass =
    accent === "violet" ? "border-violet-500 bg-violet-50/20" : "border-blue-500 bg-blue-50/20";
  const browseAccent = accent === "violet" ? "text-violet-600" : "text-blue-600";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${stepBg}`}
          >
            {step}
          </span>
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
        </div>
        <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold">
          {badge}
        </p>
      </div>

      <section
        aria-label={`${title} upload area`}
        className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px] transition-all ${
          dragActive ? dragActiveClass : "border-slate-200 hover:border-slate-300"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.[0]) {
            onDrop(e.dataTransfer.files[0]);
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              onChange(e.target.files[0]);
            }
          }}
        />

        {!preview ? (
          <button
            type="button"
            onClick={onBrowse}
            disabled={compressing}
            className={`text-center space-y-3 flex flex-col items-center py-4 w-full ${
              compressing ? "cursor-wait opacity-60" : "cursor-pointer"
            }`}
          >
            <div className="p-3.5 bg-slate-100 rounded-full text-slate-500">{icon}</div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                Drag & drop or <span className={`${browseAccent} font-semibold`}>browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                PNG, JPG, WebP — large files auto-compressed
              </p>
            </div>
          </button>
        ) : (
          <div className="w-full flex flex-col items-center space-y-4">
            <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-[180px] bg-slate-50">
              <img
                src={preview}
                alt={title}
                className="object-contain w-full h-full max-h-[180px]"
              />
              <button
                type="button"
                onClick={onClear}
                className="absolute top-2 right-2 p-1.5 bg-white/90 border border-slate-200 rounded-full text-rose-500 hover:bg-rose-500 hover:text-white cursor-pointer"
                title="Remove image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60">
              <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
              {file?.name} ({((file?.size ?? 0) / (1024 * 1024)).toFixed(2)} MB)
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
