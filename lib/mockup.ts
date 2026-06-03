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
): Promise<string> {
  const ai = getAIInstance();
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

Write one instruction for an in-scene product swap inside image 1 (NOT a cutout overlay).

Requirements:
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
  mode: GenerateMode,
): Promise<{ instruction: string; image: string | null }> {
  const instruction = await buildBriaInstruction(mockupFile, productFile);
  console.log(`[Mockup] Bria instruction:\n${instruction}`);

  if (mode === "instruction_only") {
    return { instruction, image: null };
  }

  const image = await runNanoBanana(productFile, mockupFile, instruction);
  return { instruction, image };
}
