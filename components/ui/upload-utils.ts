import type { UploadLimits } from "@/types";

export function getPerFileBudget(limits: UploadLimits, fileCount: number): number {
  if (fileCount <= 1) {
    return Math.min(limits.maxFileSizeBytes, limits.maxTotalUploadBytes);
  }
  return Math.min(limits.maxFileSizeBytes, Math.floor(limits.maxTotalUploadBytes / fileCount));
}

export function previewFile(file: File, setPreview: (url: string | null) => void) {
  const reader = new FileReader();
  reader.onload = () => setPreview(reader.result as string);
  reader.readAsDataURL(file);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function validateImageType(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please upload an image file (PNG, JPG, or WebP).";
  }
  return null;
}
