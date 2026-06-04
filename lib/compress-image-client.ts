const OUTPUT_TYPE = "image/jpeg";
const MAX_DIMENSION = 4096;

export interface CompressImageResult {
  file: File;
  wasCompressed: boolean;
  originalSize: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to encode image"));
        }
      },
      OUTPUT_TYPE,
      quality,
    );
  });
}

function drawImage(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare image canvas");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
}

export async function compressImageFile(
  file: File,
  maxBytes: number,
): Promise<CompressImageResult> {
  if (file.size <= maxBytes) {
    return { file, wasCompressed: false, originalSize: file.size };
  }

  const img = await loadImage(file);
  let width = img.naturalWidth;
  let height = img.naturalHeight;

  const maxDim = Math.max(width, height);
  if (maxDim > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / maxDim;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");

  for (let dimScale = 1; dimScale >= 0.2; dimScale *= 0.85) {
    const w = Math.max(1, Math.round(width * dimScale));
    const h = Math.max(1, Math.round(height * dimScale));
    drawImage(canvas, img, w, h);

    for (let quality = 0.88; quality >= 0.35; quality -= 0.05) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= maxBytes) {
        const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
        return {
          file: new File([blob], `${baseName}.jpg`, {
            type: OUTPUT_TYPE,
            lastModified: Date.now(),
          }),
          wasCompressed: true,
          originalSize: file.size,
        };
      }
    }
  }

  drawImage(
    canvas,
    img,
    Math.max(1, Math.round(width * 0.2)),
    Math.max(1, Math.round(height * 0.2)),
  );
  const fallback = await canvasToBlob(canvas, 0.35);
  if (fallback.size > maxBytes) {
    throw new Error("Could not compress image enough for upload");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return {
    file: new File([fallback], `${baseName}.jpg`, { type: OUTPUT_TYPE, lastModified: Date.now() }),
    wasCompressed: true,
    originalSize: file.size,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
