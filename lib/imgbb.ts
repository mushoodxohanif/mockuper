import type { UploadFile } from "./mockup";

const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

type ImgbbUploadResponse = {
  success?: boolean;
  status?: number;
  data?: { url?: string };
  error?: { message?: string; code?: number };
};

function getImgbbApiKey(): string {
  const key = process.env.IMGBB_API_KEY;
  if (!key) {
    throw new Error("IMGBB_API_KEY environment variable is required");
  }
  return key;
}

function uploadFileToBase64(file: UploadFile): string {
  return file.buffer.toString("base64");
}

function dataUrlToBase64(dataUrl: string): string {
  const match = /^data:[^;]+;base64,(.+)$/s.exec(dataUrl.trim());
  if (!match?.[1]) {
    throw new Error("Invalid data URL: expected data:<mime>;base64,<payload>");
  }
  return match[1];
}

function sourceToBase64(source: UploadFile | string): string {
  return typeof source === "string" ? dataUrlToBase64(source) : uploadFileToBase64(source);
}

export async function uploadToImgbb(source: UploadFile | string): Promise<string> {
  const key = getImgbbApiKey();
  const image = sourceToBase64(source);

  const form = new FormData();
  form.append("key", key);
  form.append("image", image);

  const response = await fetch(IMGBB_UPLOAD_URL, {
    method: "POST",
    body: form,
  });

  let body: ImgbbUploadResponse;
  try {
    body = (await response.json()) as ImgbbUploadResponse;
  } catch {
    throw new Error(`ImgBB upload failed: invalid JSON (HTTP ${response.status})`);
  }

  if (body.success === true && body.data?.url) {
    return body.data.url;
  }

  const apiMessage = body.error?.message;
  const detail = apiMessage ?? `HTTP ${response.status}`;
  throw new Error(`ImgBB upload failed: ${detail}`);
}
