import { GoogleGenAI } from "@google/genai";

export interface UploadFile {
  buffer: Buffer;
  mimetype: string;
}

const NANO_BANANA_MODELS = ["gemini-3.1-flash-image", "gemini-2.5-flash-image"] as const;

let aiInstance: GoogleGenAI | null = null;

function getAIInstance(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

function fileToRawBase64(file: UploadFile): string {
  return file.buffer.toString("base64");
}

function extractImageFromGeminiResponse(response: {
  candidates?: Array<{
    content?: {
      parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }>;
    };
  }>;
}): string {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("Model response did not include an image");
}

async function buildBriaInstruction(
  mockupFile: UploadFile,
  productFile: UploadFile,
  userInstructions: string,
): Promise<string> {
  const ai = getAIInstance();
  const trimmedNotes = userInstructions.trim();
  const userNotesBlock = trimmedNotes
    ? `The user wants this product swap in image 1:
"""
${trimmedNotes}
"""`
    : `No user swap notes were provided. Identify the product or placeholder in image 1 that image 2 should replace.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType: mockupFile.mimetype,
          data: fileToRawBase64(mockupFile),
        },
      },
      {
        inlineData: {
          mimeType: productFile.mimetype,
          data: fileToRawBase64(productFile),
        },
      },
      `Image 1 is the mockup lifestyle scene. Image 2 is the exact replacement product.

${userNotesBlock}

Write one instruction for an in-scene product swap inside image 1 (NOT a cutout overlay).

Requirements:
- ${trimmedNotes ? "Follow the user's swap notes above; use them to identify what to replace and any integration details they specified." : "Infer what to replace in image 1 from the scene and how image 2 should integrate (perspective, scale, lighting, hands, etc.)."}
- Name the object to replace in image 1.
- Describe image 2's product in exhaustive detail so the replacement matches exactly (shape, materials, texture, color, stitching, logos, text, hardware).
- Require natural in-scene integration: perspective, scale, lighting, shadows, and hand interaction.
- Forbid background removal, flat paste-on overlays, cutout stickers, or leaving the original product visible.
- Keep background, props, and composition from image 1.

Return ONLY JSON: {"instruction": "..."}`,
    ],
    config: { responseMimeType: "application/json" },
  });

  const parsed = JSON.parse(response.text || "{}") as { instruction?: string };
  if (!parsed.instruction?.trim()) {
    throw new Error("Could not build Bria instruction");
  }

  return parsed.instruction.trim();
}

async function runNanoBanana(
  productFile: UploadFile,
  mockupFile: UploadFile,
  instruction: string,
): Promise<string> {
  const ai = getAIInstance();
  const contents = [
    {
      inlineData: {
        mimeType: mockupFile.mimetype,
        data: fileToRawBase64(mockupFile),
      },
    },
    {
      inlineData: {
        mimeType: productFile.mimetype,
        data: fileToRawBase64(productFile),
      },
    },
    { text: instruction },
  ];

  let lastError: Error | null = null;
  for (const model of NANO_BANANA_MODELS) {
    try {
      console.log(`[Mockup] Nano Banana 2 (${model})`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseModalities: ["IMAGE"] },
      });
      return extractImageFromGeminiResponse(response);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      console.warn(`[Mockup] ${model} failed:`, err.message);
    }
  }

  throw lastError ?? new Error("Nano Banana image generation failed");
}

export type GenerateMode = "instruction_only" | "full";

export async function processMockup(
  productFile: UploadFile,
  mockupFile: UploadFile,
  userInstructions: string,
  mode: GenerateMode,
): Promise<{ instruction: string; image: string | null }> {
  const instruction = await buildBriaInstruction(mockupFile, productFile, userInstructions);
  console.log(`[Mockup] Bria instruction:\n${instruction}`);

  if (mode === "instruction_only") {
    return { instruction, image: null };
  }

  const image = await runNanoBanana(productFile, mockupFile, instruction);
  return { instruction, image };
}

async function buildBriaInstructionForEdit(
  productFile: UploadFile,
  userInstructions: string,
  referenceFiles: UploadFile[] = [],
): Promise<string> {
  const ai = getAIInstance();
  const referenceHint =
    referenceFiles.length > 0
      ? `\nImages 2 through ${referenceFiles.length + 1} are reference photos supplied by the user. Use them to inform what to add, match, or replicate on or inside the product in image 1 (e.g. specific items, colors, textures, branding, layout). Apply edits only to image 1 — do not paste reference images as flat overlays.\n`
      : "";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType: productFile.mimetype,
          data: fileToRawBase64(productFile),
        },
      },
      ...referenceFiles.map((file) => ({
        inlineData: {
          mimeType: file.mimetype,
          data: fileToRawBase64(file),
        },
      })),
      `Image 1 is the product photo to edit.${referenceHint}

The user wants these changes applied to the product in image 1:
"""
${userInstructions.trim()}
"""

Write one Bria instruction for an image editor (Nano Banana 2) that applies ONLY the user's requested changes to image 1.

Requirements:
- Open by describing image 1's product in exhaustive detail (shape, materials, texture, color, stitching, logos, text, hardware, proportions) so those attributes are locked and must remain identical unless the user explicitly asked to change them.
- State clearly that the product's intrinsic properties must not change: no recoloring, reshaping, retexturing, rebranding, or resizing unless explicitly requested.
- Apply only what the user asked for (e.g. add items inside, fill empty areas, remove elements) without redesigning the product itself.
- For additive requests (e.g. add cards and cash inside an empty wallet), add those elements naturally while the wallet itself stays identical in color, shape, material, and texture.
- Keep camera angle, lighting style, and overall composition unless the user asked otherwise.
- Forbid background replacement, cutout overlays, or unrelated scene changes unless the user requested them.

Return ONLY JSON: {"instruction": "..."}`,
    ],
    config: { responseMimeType: "application/json" },
  });

  const parsed = JSON.parse(response.text || "{}") as { instruction?: string };
  if (!parsed.instruction?.trim()) {
    throw new Error("Could not build Bria instruction");
  }

  return parsed.instruction.trim();
}

async function runNanoBananaForEdit(productFile: UploadFile, instruction: string): Promise<string> {
  const ai = getAIInstance();
  const contents = [
    {
      inlineData: {
        mimeType: productFile.mimetype,
        data: fileToRawBase64(productFile),
      },
    },
    { text: instruction },
  ];

  let lastError: Error | null = null;
  for (const model of NANO_BANANA_MODELS) {
    try {
      console.log(`[ProductEdit] Nano Banana 2 (${model})`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseModalities: ["IMAGE"] },
      });
      return extractImageFromGeminiResponse(response);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      console.warn(`[ProductEdit] ${model} failed:`, err.message);
    }
  }

  throw lastError ?? new Error("Nano Banana image generation failed");
}

export async function processProductEdit(
  productFile: UploadFile,
  userInstructions: string,
  mode: GenerateMode,
  referenceFiles: UploadFile[] = [],
): Promise<{ instruction: string; image: string | null }> {
  const instruction = await buildBriaInstructionForEdit(
    productFile,
    userInstructions,
    referenceFiles,
  );
  console.log(`[ProductEdit] Bria instruction:\n${instruction}`);

  if (mode === "instruction_only") {
    return { instruction, image: null };
  }

  const image = await runNanoBananaForEdit(productFile, instruction);
  return { instruction, image };
}
