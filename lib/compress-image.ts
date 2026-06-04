import sharp from "sharp";
import type { UploadFile } from "./mockup";
import { formatMegabytes } from "./upload-limits";

const OUTPUT_MIME = "image/jpeg";
const MAX_DIMENSION = 4096;

export async function compressUploadFile(file: UploadFile, maxBytes: number): Promise<UploadFile> {
  if (file.buffer.length <= maxBytes) {
    return file;
  }

  const meta = await sharp(file.buffer, { failOn: "none" }).rotate().metadata();
  let width = meta.width ?? 2048;
  let height = meta.height ?? 2048;

  const maxDim = Math.max(width, height);
  if (maxDim > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / maxDim;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  for (let dimScale = 1; dimScale >= 0.2; dimScale *= 0.85) {
    const w = Math.max(1, Math.round(width * dimScale));
    const h = Math.max(1, Math.round(height * dimScale));

    for (let quality = 88; quality >= 35; quality -= 5) {
      const out = await sharp(file.buffer, { failOn: "none" })
        .rotate()
        .resize(w, h, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

      if (out.length <= maxBytes) {
        return { buffer: out, mimetype: OUTPUT_MIME };
      }
    }
  }

  const fallback = await sharp(file.buffer, { failOn: "none" })
    .rotate()
    .resize(640, 640, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 35, mozjpeg: true })
    .toBuffer();

  if (fallback.length > maxBytes) {
    throw new Error(`Could not compress image below ${formatMegabytes(maxBytes)} MB`);
  }

  return { buffer: fallback, mimetype: OUTPUT_MIME };
}
