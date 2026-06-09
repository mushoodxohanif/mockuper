"use client";

import { FileImage } from "lucide-react";
import type { DragEvent, RefObject } from "react";
import { DropZone } from "@/components/ui/drop-zone";

type UploadProductProps = {
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
  onPreviewClick?: () => void;
  annotationCount?: number;
};

export function UploadProduct({
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
  onPreviewClick,
  annotationCount,
}: UploadProductProps) {
  return (
    <DropZone
      step="1"
      title="Product (Subject) Image"
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
      icon={<FileImage className="w-6 h-6" />}
      onPreviewClick={onPreviewClick}
      annotationCount={annotationCount}
    />
  );
}
