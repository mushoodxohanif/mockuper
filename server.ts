import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;
const BRIA_ENGINE = "https://engine.prod.bria-api.com";
const BRIA_USER_AGENT = "BriaPlatform/APIdocs/LLMsAgent";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

function getBriaApiKey(): string {
  const key = process.env.BRIA_API_KEY;
  if (!key) {
    throw new Error("BRIA_API_KEY environment variable is required");
  }
  return key;
}

function briaAuthHeaders(apiKey: string): Record<string, string> {
  return {
    api_token: apiKey,
    "User-Agent": BRIA_USER_AGENT,
  };
}

function briaHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...briaAuthHeaders(apiKey),
  };
}

function fileToRawBase64(file: Express.Multer.File): string {
  return file.buffer.toString("base64");
}

function fileToDataUrl(file: Express.Multer.File): string {
  return `data:${file.mimetype};base64,${fileToRawBase64(file)}`;
}

const GEMINI_IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image",
] as const;

const SCENE_REPLACE_PROMPT = `Image 1 is the mockup lifestyle scene (the photograph to edit in place).
Image 2 is the exact product reference — the only source of truth for product appearance.

Replace the focal/placeholder product in Image 1 with the product from Image 2.

Requirements:
- Match Image 2 exactly: shape, materials, grain/texture, color, stitching, logos, debossing, hardware, and all branding text.
- Integrate naturally into the scene: correct perspective, scale, lighting, shadows, and realistic interaction with hands or props. It must look photographed in this scene — NOT a background-removed cutout pasted on top.
- Keep Image 1's scene as inspiration: preserve hand pose, background, props, and camera angle unless a minimal adjustment is required for realism.
- Do not invent product details absent from Image 2. Do not leave the original placeholder product visible.`;

async function downloadToBase64(url: string, apiKey: string): Promise<string> {
  const headers = url.includes("bria.ai")
    ? briaAuthHeaders(apiKey)
    : { "User-Agent": BRIA_USER_AGENT };
  const isTempAsset = url.includes("temp.bria.ai");
  const maxAttempts = isTempAsset ? 20 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get("content-type") || "image/png";
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }

    if (isTempAsset && (response.status === 403 || response.status === 404) && attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    throw new Error(`Failed to fetch image from URL: ${url}. Status: ${response.status}`);
  }

  throw new Error(`Failed to fetch image from URL: ${url}`);
}

async function pollBriaJob(
  statusUrl: string,
  apiKey: string,
  label: string,
  maxAttempts = 60,
  delayMs = 2000
): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const statusRes = await fetch(statusUrl, {
      headers: briaHeaders(apiKey),
    });

    if (!statusRes.ok) {
      console.error(`[${label}] Status poll attempt ${attempt} failed: ${statusRes.status}`);
      continue;
    }

    const statusData = await statusRes.json() as any;
    const status = String(statusData.status || "").toUpperCase();
    console.log(`[${label}] Poll attempt ${attempt}: ${status}`);

    if (status === "COMPLETED") {
      return statusData;
    }

    if (status === "ERROR" || status === "FAILED" || status === "FAILURE") {
      throw new Error(`${label} job failed: ${JSON.stringify(statusData)}`);
    }
  }

  throw new Error(`${label} timed out while waiting for completion`);
}

function extractImageUrl(payload: any): string | null {
  if (!payload) return null;

  if (typeof payload.result_url === "string") return payload.result_url;
  if (typeof payload.url === "string") return payload.url;
  if (payload.result?.image_url) return payload.result.image_url;
  if (payload.data?.url) return payload.data.url;

  const nestedResult = payload.result;
  if (Array.isArray(nestedResult)) {
    const first = nestedResult[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    if (typeof first === "string") return first;
  }

  return null;
}

async function callBriaEndpoint(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string,
  label: string,
  sync = false
): Promise<string> {
  const response = await fetch(`${BRIA_ENGINE}${endpoint}`, {
    method: "POST",
    headers: briaHeaders(apiKey),
    body: JSON.stringify({ ...body, sync }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${label} rejected request (${response.status}): ${errorText}`);
  }

  const result = await response.json() as any;
  let imageUrl: string | null = null;

  if (result.status_url) {
    const completed = await pollBriaJob(result.status_url, apiKey, label);
    imageUrl = extractImageUrl(completed);
  }

  if (!imageUrl) {
    imageUrl = extractImageUrl(result);
  }

  if (!imageUrl) {
    throw new Error(`${label} did not return an image URL: ${JSON.stringify(result)}`);
  }

  return imageUrl;
}

let aiInstance: GoogleGenAI | null = null;
function getAIInstance(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is required for scene replace mode");
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

function extractImageFromGeminiResponse(response: {
  candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
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

async function buildReplaceInstruction(
  mockupFile: Express.Multer.File,
  productFile: Express.Multer.File
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
    throw new Error("Could not build a product replacement instruction");
  }

  return parsed.instruction.trim();
}

async function runGeminiSceneReplace(
  productFile: Express.Multer.File,
  mockupFile: Express.Multer.File
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
    { text: SCENE_REPLACE_PROMPT },
  ];

  let lastError: Error | null = null;
  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      console.log(`[Scene Replace] Trying Gemini model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseModalities: ["IMAGE"] },
      });
      return extractImageFromGeminiResponse(response);
    } catch (error: any) {
      lastError = error;
      console.warn(`[Scene Replace] ${model} failed:`, error.message);
    }
  }

  throw lastError ?? new Error("Gemini scene replace failed");
}

async function runBriaSceneReplace(
  productFile: Express.Multer.File,
  mockupFile: Express.Multer.File,
  apiKey: string
): Promise<string> {
  const instruction = await buildReplaceInstruction(mockupFile, productFile);
  console.log(`[Scene Replace] Bria instruction: ${instruction}`);

  const imageUrl = await callBriaEndpoint(
    "/v2/image/edit/replace_object_by_text",
    { image: fileToDataUrl(mockupFile), instruction },
    apiKey,
    "Scene Product Replace",
    false
  );

  return downloadToBase64(imageUrl, apiKey);
}

async function runInSceneReplace(
  productFile: Express.Multer.File,
  mockupFile: Express.Multer.File,
  apiKey: string
): Promise<string> {
  try {
    return await runGeminiSceneReplace(productFile, mockupFile);
  } catch (geminiError: any) {
    console.warn(
      `[Scene Replace] Gemini failed (${geminiError.message}), falling back to Bria in-scene edit`
    );
    return runBriaSceneReplace(productFile, mockupFile, apiKey);
  }
}

async function runLifestyleShotByImage(
  productFile: Express.Multer.File,
  mockupFile: Express.Multer.File,
  apiKey: string
): Promise<string> {
  const imageUrl = await callBriaEndpoint(
    "/v1/product/lifestyle_shot_by_image",
    {
      file: fileToRawBase64(productFile),
      ref_image_file: [fileToRawBase64(mockupFile)],
      placement_type: "original",
      ref_image_influence: 0.85,
      enhance_ref_image: false,
      force_rmbg: true,
      num_results: 1,
      original_quality: true,
    },
    apiKey,
    "Lifestyle Product Shot",
    true
  );

  return downloadToBase64(imageUrl, apiKey);
}

const mockupUpload = upload.fields([
  { name: "product", maxCount: 1 },
  { name: "mockup", maxCount: 1 },
]);

app.post("/api/process/mockup", mockupUpload, async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const productFile = files?.product?.[0];
    const mockupFile = files?.mockup?.[0];

    if (!productFile || !mockupFile) {
      res.status(400).json({ error: "Missing required product or mockup files." });
      return;
    }

    const apiKey = getBriaApiKey();
    const method = String(req.body?.method || "precise");

    if (method === "precise") {
      const image = await runInSceneReplace(productFile, mockupFile, apiKey);
      res.json({ image, method: "precise" });
      return;
    }

    const image = await runLifestyleShotByImage(productFile, mockupFile, apiKey);
    res.json({ image, method: "lifestyle" });
  } catch (error: any) {
    console.error("Mockup processing error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate mockup",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Server listening on http://localhost:${PORT}`);
  });
}

startServer();
