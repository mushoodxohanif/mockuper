import type { GenerateMode, UploadFile } from "./mockup.js";
import { formatMegabytes, getMaxFileSizeBytes, getMaxTotalUploadBytes } from "./upload-limits.js";

const MAX_FILE_SIZE = getMaxFileSizeBytes();
const MAX_TOTAL_UPLOAD = getMaxTotalUploadBytes();

export interface MockupUploadFields {
  product?: UploadFile;
  mockup?: UploadFile;
  mode: GenerateMode;
}

function getFormFile(formData: FormData, name: string): File | undefined {
  const value = formData.get(name);
  if (value == null || typeof value === "string") {
    return undefined;
  }
  if (value.size === 0) {
    return undefined;
  }
  return value;
}

async function fileToUpload(file: File): Promise<UploadFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds ${formatMegabytes(MAX_FILE_SIZE)} MB limit`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    buffer,
    mimetype: file.type || "application/octet-stream",
  };
}

export async function parseMockupMultipart(req: Request): Promise<MockupUploadFields> {
  const formData = await req.formData();
  const files: MockupUploadFields = { mode: "instruction_only" as GenerateMode };

  const product = getFormFile(formData, "product");
  if (product) {
    files.product = await fileToUpload(product);
  }

  const mockup = getFormFile(formData, "mockup");
  if (mockup) {
    files.mockup = await fileToUpload(mockup);
  }

  const totalBytes = (files.product?.buffer.length ?? 0) + (files.mockup?.buffer.length ?? 0);
  if (totalBytes > MAX_TOTAL_UPLOAD) {
    throw new Error(
      `Combined upload exceeds ${formatMegabytes(MAX_TOTAL_UPLOAD)} MB (Vercel allows at most 4.5 MB per request)`,
    );
  }

  const modeField = formData.get("mode");
  files.mode = modeField === "instruction_only" ? "instruction_only" : "full";

  return files;
}

export interface ProductEditUploadFields {
  product?: UploadFile;
  instructions: string;
  mode: GenerateMode;
}

export async function parseProductEditMultipart(req: Request): Promise<ProductEditUploadFields> {
  const formData = await req.formData();
  const files: ProductEditUploadFields = {
    instructions: "",
    mode: "instruction_only" as GenerateMode,
  };

  const product = getFormFile(formData, "product");
  if (product) {
    files.product = await fileToUpload(product);
  }

  const instructionsField = formData.get("instructions");
  if (typeof instructionsField === "string") {
    files.instructions = instructionsField.trim();
  }

  const totalBytes = files.product?.buffer.length ?? 0;
  if (totalBytes > MAX_TOTAL_UPLOAD) {
    throw new Error(
      `Upload exceeds ${formatMegabytes(MAX_TOTAL_UPLOAD)} MB (Vercel allows at most 4.5 MB per request)`,
    );
  }

  const modeField = formData.get("mode");
  files.mode = modeField === "instruction_only" ? "instruction_only" : "full";

  return files;
}
