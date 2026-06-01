import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generateMockup } from "./lib/mockup.js";
import { parseMockupMultipart } from "./lib/parse-multipart.js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.post("/api/process/mockup", async (req, res) => {
  try {
    const { product, mockup } = await parseMockupMultipart(req);

    if (!product || !mockup) {
      res.status(400).json({ error: "Missing required product or mockup files." });
      return;
    }

    const { image, instruction } = await generateMockup(product, mockup);
    res.json({ image, instruction });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate mockup";
    console.error("Mockup processing error:", error);
    res.status(500).json({ error: message });
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
