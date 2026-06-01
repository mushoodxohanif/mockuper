import type { UploadFile } from "./mockup.js";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export interface MockupUploadFields {
  product?: UploadFile;
  mockup?: UploadFile;
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
  const files: MockupUploadFields = {};

  const product = formData.get("product");
  if (product instanceof File && product.size > 0) {
    files.product = await fileToUpload(product);
  }

  const mockup = formData.get("mockup");
  if (mockup instanceof File && mockup.size > 0) {
    files.mockup = await fileToUpload(mockup);
  }

  return files;
}
