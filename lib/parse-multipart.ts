import type { ImageAnnotation } from "@/types";
import { compressUploadFile } from "./compress-image";
import type { GenerateMode, UploadFile } from "./mockup";
import { formatMegabytes, getMaxTotalUploadBytes, getPerFileUploadBudget } from "./upload-limits";

const MAX_TOTAL_UPLOAD = getMaxTotalUploadBytes();

export interface MockupUploadFields {
  product?: UploadFile;
  mockup?: UploadFile;
  instructions: string;
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

function getFormFiles(formData: FormData, name: string): File[] {
  const files: File[] = [];
  for (const value of formData.getAll(name)) {
    if (value == null || typeof value === "string" || value.size === 0) {
      continue;
    }
    files.push(value);
  }
  return files;
}

async function fileToUpload(file: File, fileCount: number): Promise<UploadFile> {
  const budget = getPerFileUploadBudget(fileCount);
  const upload: UploadFile = {
    buffer: Buffer.from(await file.arrayBuffer()),
    mimetype: file.type || "application/octet-stream",
  };
  return compressUploadFile(upload, budget);
}

export async function parseMockupMultipart(req: Request): Promise<MockupUploadFields> {
  const formData = await req.formData();
  const files: MockupUploadFields = {
    instructions: "",
    mode: "instruction_only" as GenerateMode,
  };

  const product = getFormFile(formData, "product");
  const mockup = getFormFile(formData, "mockup");
  const fileCount = (product ? 1 : 0) + (mockup ? 1 : 0);

  if (product) {
    files.product = await fileToUpload(product, fileCount);
  }

  if (mockup) {
    files.mockup = await fileToUpload(mockup, fileCount);
  }

  const totalBytes = (files.product?.buffer.length ?? 0) + (files.mockup?.buffer.length ?? 0);
  if (totalBytes > MAX_TOTAL_UPLOAD) {
    throw new Error(
      `Combined upload exceeds ${formatMegabytes(MAX_TOTAL_UPLOAD)} MB (Vercel allows at most 4.5 MB per request)`,
    );
  }

  const instructionsField = formData.get("instructions");
  if (typeof instructionsField === "string") {
    files.instructions = instructionsField.trim();
  }

  const modeField = formData.get("mode");
  files.mode = modeField === "instruction_only" ? "instruction_only" : "full";

  return files;
}

export interface ProductEditUploadFields {
  product?: UploadFile;
  references: UploadFile[];
  instructions: string;
  annotations: ImageAnnotation[];
  mode: GenerateMode;
}

export async function parseProductEditMultipart(req: Request): Promise<ProductEditUploadFields> {
  const formData = await req.formData();
  const files: ProductEditUploadFields = {
    references: [],
    instructions: "",
    annotations: [],
    mode: "instruction_only" as GenerateMode,
  };

  const product = getFormFile(formData, "product");
  const referenceInputs = getFormFiles(formData, "references");
  const fileCount = (product ? 1 : 0) + referenceInputs.length;

  if (product) {
    files.product = await fileToUpload(product, fileCount || 1);
  }

  for (const reference of referenceInputs) {
    files.references.push(await fileToUpload(reference, fileCount || 1));
  }

  const instructionsField = formData.get("instructions");
  if (typeof instructionsField === "string") {
    files.instructions = instructionsField.trim();
  }

  const annotationsField = formData.get("annotations");
  if (typeof annotationsField === "string" && annotationsField.trim()) {
    try {
      const parsed = JSON.parse(annotationsField) as unknown;
      if (Array.isArray(parsed)) {
        files.annotations = parsed.filter(isValidImageAnnotation);
      }
    } catch {
      throw new Error("Invalid annotation data.");
    }
  }

  const totalBytes =
    (files.product?.buffer.length ?? 0) +
    files.references.reduce((sum, file) => sum + file.buffer.length, 0);
  if (totalBytes > MAX_TOTAL_UPLOAD) {
    throw new Error(
      `Combined upload exceeds ${formatMegabytes(MAX_TOTAL_UPLOAD)} MB (Vercel allows at most 4.5 MB per request)`,
    );
  }

  const modeField = formData.get("mode");
  files.mode = modeField === "instruction_only" ? "instruction_only" : "full";

  return files;
}

function isValidImageAnnotation(value: unknown): value is ImageAnnotation {
  if (!value || typeof value !== "object") {
    return false;
  }
  const annotation = value as ImageAnnotation;
  if (typeof annotation.id !== "string" || typeof annotation.note !== "string") {
    return false;
  }
  if (annotation.type === "marker") {
    return typeof annotation.x === "number" && typeof annotation.y === "number";
  }
  if (annotation.type === "selection") {
    return (
      Array.isArray(annotation.points) &&
      annotation.points.length >= 3 &&
      annotation.points.every(
        (point) =>
          point &&
          typeof point === "object" &&
          typeof point.x === "number" &&
          typeof point.y === "number",
      )
    );
  }
  return false;
}

export interface FeedbackUploadFields {
  sentiment: "positive" | "negative" | null;
  comment: string;
  image?: UploadFile;
}

export async function parseFeedbackMultipart(req: Request): Promise<FeedbackUploadFields> {
  const formData = await req.formData();

  const sentimentField = formData.get("sentiment");
  const sentiment =
    sentimentField === "positive" || sentimentField === "negative" ? sentimentField : null;

  let comment = "";
  const commentField = formData.get("comment");
  if (typeof commentField === "string") {
    comment = commentField.trim();
  }

  const imageFile = getFormFile(formData, "image");
  let image: UploadFile | undefined;
  if (imageFile) {
    image = await fileToUpload(imageFile, 1);
  }

  return { sentiment, comment, image };
}
