import type { GenerateMode, UploadFile } from "./mockup.js";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

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
    throw new Error("File exceeds 20MB limit");
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

  const modeField = formData.get("mode");
  files.mode = modeField === "instruction_only" ? "instruction_only" : "full";

  return files;
}
