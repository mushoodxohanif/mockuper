"use client";

import { Upload } from "lucide-react";
import type { DragEvent, RefObject } from "react";
import { DropZone } from "@/components/ui/drop-zone";

type UploadMockupPanelProps = {
  compressing: boolean;
  preview: string | null;
  file: File | null;
  dragActive: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (file: File) => void;
  onBrowse: () => void;
  onClear: () => void;
  onChange: (file: File) => void;
};

export function UploadMockupPanel({
  compressing,
  preview,
  file,
  dragActive,
  inputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowse,
  onClear,
  onChange,
}: UploadMockupPanelProps) {
  return (
    <DropZone
      step="2"
      title="Mockup (Background) Scene"
      compressing={compressing}
      preview={preview}
      file={file}
      dragActive={dragActive}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onBrowse={onBrowse}
      onClear={onClear}
      inputRef={inputRef}
      onChange={onChange}
      icon={<Upload className="w-6 h-6" />}
    />
  );
}

type MockupSwapInstructionsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MockupSwapInstructions({ value, onChange }: MockupSwapInstructionsProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
            3
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Swap instructions</h3>
        </div>
        <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold">
          OPTIONAL
        </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Replace the brown leather handbag on the marble table with the product from image 2. Keep the same hand position, perspective, and lighting."
        rows={8}
        className="flex-1 min-h-[220px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-y"
      />
      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Optional: describe what to replace and any integration details. Without notes, the Bria
        instruction is inferred from both images alone.
      </p>
    </div>
  );
}
