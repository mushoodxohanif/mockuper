"use client";

import { ImagePlus, X } from "lucide-react";
import type { DragEvent, RefObject } from "react";
import type { ReferenceImage } from "@/types";

type UploadReferencesProps = {
  compressing: boolean;
  images: ReferenceImage[];
  dragActive: boolean;
  maxImages: number;
  inputRef: RefObject<HTMLInputElement | null>;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (files: FileList) => void;
  onBrowse: () => void;
  onClearAll: () => void;
  onRemove: (id: string) => void;
  onChange: (files: FileList) => void;
};

export function UploadReferences({
  compressing,
  images,
  dragActive,
  maxImages,
  inputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowse,
  onClearAll,
  onRemove,
  onChange,
}: UploadReferencesProps) {
  const atLimit = images.length >= maxImages;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center font-bold text-xs">
            3
          </span>
          <h3 className="font-bold text-slate-900 text-sm">Reference images</h3>
        </div>
        <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold">
          OPTIONAL
        </p>
      </div>

      <section
        aria-label="Reference images upload area"
        className={`border-2 border-dashed rounded-xl p-4 transition-all ${
          dragActive
            ? "border-violet-500 bg-violet-50/20"
            : "border-slate-200 hover:border-slate-300"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) {
            onDrop(e.dataTransfer.files);
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              onChange(e.target.files);
            }
          }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-50 rounded-full text-violet-600">
              <ImagePlus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                Add photos the AI should use when writing the instruction
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                e.g. cards, cash, packaging — up to {maxImages} images ({images.length}/{maxImages})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {images.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-rose-200 cursor-pointer"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onBrowse}
              disabled={compressing || atLimit}
              className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-all ${
                compressing || atLimit
                  ? "border-slate-200 text-slate-400 cursor-not-allowed"
                  : "border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 cursor-pointer"
              }`}
            >
              {atLimit ? "Limit reached" : "Add images"}
            </button>
          </div>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-square"
              >
                <img
                  src={image.preview}
                  alt={image.file.name}
                  className="object-cover w-full h-full"
                />
                <button
                  type="button"
                  onClick={() => onRemove(image.id)}
                  className="absolute top-1.5 right-1.5 p-1 bg-white/90 border border-slate-200 rounded-full text-slate-500 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                  title="Remove reference"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <p className="absolute bottom-0 inset-x-0 text-[9px] font-medium text-white bg-black/50 px-1.5 py-1 truncate">
                  {image.file.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Reference images are sent to Gemini with your edit instructions. They help describe what to
        add or match; only the main product photo is edited by Nano Banana 2.
      </p>
    </div>
  );
}
