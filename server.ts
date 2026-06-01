import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup multer in-memory storage, 20MB max file size
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// JSON parsing with expanded limits for high-res base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper function to fetch images and convert to base64
async function downloadToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${url}. Status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

// Lazy client-side Gemini critique and prompter
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

// Helper to describe mockup image using Gemini in one rich, visual paragraph
async function generatePromptFromMockup(mockupFile: Express.Multer.File): Promise<string> {
  const ai = getAIInstance();
  const base64Str = mockupFile.buffer.toString("base64");
  const promptText = `
You are an expert design and advertising art director. Analyze this background/mockup image and write a highly detailed, descriptive, single-paragraph prompt (under 60 words and strictly no introductory or concluding remarks) that describes the scene's layout, platform (if any), colors, surface, furniture, studio lighting, perspective, and style – suitable for an AI image generator to recreate this exact background scene matching the product placement context.
`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType: mockupFile.mimetype,
          data: base64Str
        }
      },
      promptText
    ]
  });
  return response.text?.trim() || "Resting in a modern photo studio setting with soft layout lighting.";
}

// Route to process Picsart Mockup Placement
app.post("/api/process/picsart", upload.fields([
  { name: "product", maxCount: 1 },
  { name: "mockup", maxCount: 1 }
]), async (req: express.Request, res: express.Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const productFile = files?.product?.[0];
    const mockupFile = files?.mockup?.[0];

    if (!productFile || !mockupFile) {
      res.status(400).json({ error: "Missing required product or mockup files." });
      return;
    }

    const apiKey = process.env.PICSART_API_KEY || "paat-NtzMTcHOjLpszrhx1lfr0Llf5TX";

    // Build standard multipart request based on correct removebg documentation
    const formData = new FormData();
    const productBlob = new Blob([productFile.buffer], { type: productFile.mimetype });
    formData.append("image", productBlob, productFile.originalname);
    formData.append("output_type", "cutout");
    formData.append("bg_blur", "0");
    formData.append("scale", "fit");
    formData.append("auto_center", "false");
    formData.append("stroke_size", "0");
    formData.append("stroke_color", "FFFFFF");
    formData.append("stroke_opacity", "100");
    formData.append("shadow", "disabled");
    formData.append("shadow_opacity", "20");
    formData.append("shadow_blur", "50");
    formData.append("model", "urn:air:picsart:model:picsart:sod@10");
    formData.append("format", "PNG");

    const response = await fetch("https://api.picsart.io/tools/1.0/removebg", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "x-picsart-api-key": apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({
        error: `Picsart API rejected transaction. Status: ${response.status}`,
        details: errorText
      });
      return;
    }

    const result = await response.json() as any;
    if (result.status !== "success" || !result.data?.url) {
      res.status(500).json({
        error: "Picsart returned empty output or error status.",
        details: JSON.stringify(result)
      });
      return;
    }

    // Download resulting cutout image and return base64
    const base64Data = await downloadToBase64(result.data.url);
    res.json({ image: base64Data });

  } catch (error: any) {
    console.error("Picsart routing error:", error);
    res.status(500).json({
      error: "Critical failure in processing Picsart API request.",
      details: error.message || String(error)
    });
  }
});

// Route to process Photoroom Mockup Placement
app.post("/api/process/photoroom", upload.fields([
  { name: "product", maxCount: 1 },
  { name: "mockup", maxCount: 1 }
]), async (req: express.Request, res: express.Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const productFile = files?.product?.[0];
    const mockupFile = files?.mockup?.[0];

    if (!productFile || !mockupFile) {
      res.status(400).json({ error: "Missing required product or mockup files." });
      return;
    }

    const apiKey = process.env.PHOTOROOM_API_KEY || "sk_pr_default_71a0ec561a8c7572cb6be791d8f315490947595e";

    // Build standard multipart request based on correct segment cURL documentation
    const formData = new FormData();
    const productBlob = new Blob([productFile.buffer], { type: productFile.mimetype });
    formData.append("image_file", productBlob, productFile.originalname);

    const mockupBlob = new Blob([mockupFile.buffer], { type: mockupFile.mimetype });
    formData.append("background_image", mockupBlob, mockupFile.originalname);
    
    // Add correct SDK query configuration forms
    formData.append("format", "png");

    const response = await fetch("https://sdk.photoroom.com/v1/segment", {
      method: "POST",
      headers: {
        "x-api-key": apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({
        error: `Photoroom API rejected transaction. Status: ${response.status}`,
        details: errorText
      });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = `data:image/png;base64,${buffer.toString("base64")}`;
    res.json({ image: base64Data });

  } catch (error: any) {
    console.error("Photoroom routing error:", error);
    res.status(500).json({
      error: "Critical failure in processing Photoroom API request.",
      details: error.message || String(error)
    });
  }
});

// Route to process Bria AI Mockup Placement
app.post("/api/process/bria", upload.fields([
  { name: "product", maxCount: 1 },
  { name: "mockup", maxCount: 1 }
]), async (req: express.Request, res: express.Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const productFile = files?.product?.[0];
    const mockupFile = files?.mockup?.[0];

    if (!productFile || !mockupFile) {
      res.status(400).json({ error: "Missing required product or mockup files." });
      return;
    }

    const apiKey = process.env.BRIA_API_KEY || "f368007f829c469cb10541b24cc41639";

    // Set fallback prompt verbatim from the docs
    let prompt = "Resting on a light pink circular platform placed on a bright red floor in a photo studio. The background is a vivid red wall with subtle vertical lines. Surrounding the platform are numerous 3D red poppy flowers in varying sizes. Sliced and whole grapefruits are arranged around the base of the platform, adding fresh color contrast. Lit evenly by soft studio lighting. Shot from a front angle.";

    // Automatically analyze mockup background image to construct a perfect prompt
    if (process.env.GEMINI_API_KEY) {
      try {
        prompt = await generatePromptFromMockup(mockupFile);
        console.log("[Bria AI] Dynamically generated background prompt:", prompt);
      } catch (geminiError) {
        console.error("[Bria AI] Failed to generate dynamic prompt with Gemini, falling back to visual default.", geminiError);
      }
    }

    // Convert product image buffer directly into base64 data URL
    const productBase64 = `data:${productFile.mimetype};base64,${productFile.buffer.toString("base64")}`;

    // Build Bria AI v2 JSON request body
    const requestBody = {
      image: productBase64,
      prompt: prompt,
      mode: "high_control"
    };

    const response = await fetch("https://engine.prod.bria-api.com/v2/image/edit/replace_background", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_token": apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({
        error: `Bria AI API rejected transaction. Status: ${response.status}`,
        details: errorText
      });
      return;
    }

    const result = await response.json() as any;
    let resultUrl = result.result_url || result.url || result.result || (result.data && result.data.url);

    // If the image URL is not returned immediately (e.g. status 202 with status_url is returned)
    if (!resultUrl && result.status_url) {
      console.log(`[Bria AI] Background placement job accepted. Polling status_url...`);
      let attempts = 0;
      const maxAttempts = 15;
      const delayMs = 2000;

      while (attempts < maxAttempts) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        const statusRes = await fetch(result.status_url, {
          headers: {
            "api_token": apiKey
          }
        });

        if (statusRes.ok) {
          const statusData = await statusRes.json() as any;
          console.log(`[Bria AI] Polling attempt ${attempts}: status is ${statusData.status}`);
          
          if (statusData.status === "COMPLETED" && statusData.result?.image_url) {
            resultUrl = statusData.result.image_url;
            break;
          } else if (statusData.status === "failure" || statusData.status === "FAILED") {
            throw new Error(`Bria AI background replacement job failed internally: ${JSON.stringify(statusData)}`);
          }
        } else {
          console.error(`[Bria AI] Failed to retrieve status on attempt ${attempts}. Status: ${statusRes.status}`);
        }
      }
    }

    if (!resultUrl) {
      res.status(500).json({
        error: "Bria AI did not return a valid result image URL.",
        details: JSON.stringify(result)
      });
      return;
    }

    const base64Data = await downloadToBase64(resultUrl);
    res.json({ image: base64Data });

  } catch (error: any) {
    console.error("Bria AI routing error:", error);
    res.status(500).json({
      error: "Critical failure in processing Bria AI API request.",
      details: error.message || String(error)
    });
  }
});

// Route to perform Gemini Critique of the comparison results
app.post("/api/critique", async (req: express.Request, res: express.Response) => {
  try {
    const { picsartImg, photoroomImg, briaImg, originalProductImg, originalMockupImg } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({ error: "Gemini API key is not configured in environment variables." });
      return;
    }

    const ai = getAIInstance();

    // Use gemini-2.5-flash for rapid, rich layout critique
    const prompt = `
You are an expert AI Graphics and Product Marketing Assessor. Analyze these three compared mockup insertion results and output a structured JSON model with ratings and textual feedback for Picsart, Photoroom, and Bria AI:

Review factors:
1. Shading, lighting integration, shadow realism.
2. Edge clipping, blending, masking quality, transparency artifacting.
3. Object placement, perspective matching, scaling.
4. Color temperature and color correction consistency.

YOUR RESPONSE MUST BE A VALID JSON STRING ONLY. DO NOT EMBED IN MARKDOWN TRIPLE BACKTICKS. JUST OUTPUT THE PLAIN JSON OBJECT:
{
  "scores": {
    "picsart": 8.5,
    "photoroom": 9.2,
    "bria": 7.8
  },
  "verdict": "Which service overall is the best and why in details.",
  "reviews": {
    "picsart": {
      "masking": "edge blend review text",
      "lighting": "lighting consistency text",
      "perspective": "scaling alignment text",
      "summary": "Pros and cons text"
    },
    "photoroom": {
      "masking": "edge blend review text",
      "lighting": "lighting consistency text",
      "perspective": "scaling alignment text",
      "summary": "Pros and cons text"
    },
    "bria": {
      "masking": "edge blend review text",
      "lighting": "lighting consistency text",
      "perspective": "scaling alignment text",
      "summary": "Pros and cons text"
    }
  }
}
Keep feedback extremely constructive and analytical.
`;

    // Package contents
    const contents: any[] = [];
    
    // Auxiliary helper for image conversion (stripping mime prefixes for Gemini ingestion)
    const toPart = (base64Str: string) => {
      const match = base64Str.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        return {
          inlineData: {
            mimeType: `image/${match[1]}`,
            data: match[2]
          }
        };
      }
      return null;
    };

    if (originalProductImg) {
      const part = toPart(originalProductImg);
      if (part) contents.push(part);
    }
    if (originalMockupImg) {
      const part = toPart(originalMockupImg);
      if (part) contents.push(part);
    }
    if (picsartImg) {
      const part = toPart(picsartImg);
      if (part) contents.push(part);
    }
    if (photoroomImg) {
      const part = toPart(photoroomImg);
      if (part) contents.push(part);
    }
    if (briaImg) {
      const part = toPart(briaImg);
      if (part) contents.push(part);
    }

    contents.push(prompt);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsedJson = JSON.parse(response.text || "{}");
    res.json(parsedJson);

  } catch (error: any) {
    console.error("Gemini Critique error:", error);
    res.status(500).json({
      error: "Could not compile Gemini comparison critique.",
      details: error.message || String(error)
    });
  }
});

// Setup Dev & Production Assets Flow
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Server listening smoothly on http://localhost:${PORT}`);
  });
}

startServer();
