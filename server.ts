import index from "./index.html";
import { handleMockupRequest } from "./lib/handle-mockup.js";

const PORT = Number(process.env.PORT) || 3000;
const isDev = process.env.NODE_ENV !== "production";

const shared = {
  port: PORT,
  hostname: "0.0.0.0" as const,
  routes: {
    "/api/process/mockup": {
      POST: handleMockupRequest,
    },
  },
};

const server = isDev
  ? Bun.serve({
      ...shared,
      development: {
        hmr: process.env.DISABLE_HMR !== "true",
        console: true,
      },
      routes: {
        ...shared.routes,
        "/": index,
      },
      fetch() {
        return new Response("Not Found", { status: 404 });
      },
    })
  : Bun.serve({
      ...shared,
      development: false,
      async fetch(req) {
        const url = new URL(req.url);
        const distFile = Bun.file(`./dist${url.pathname}`);

        if (url.pathname !== "/" && (await distFile.exists())) {
          return new Response(distFile);
        }

        if (req.method === "GET") {
          return new Response(Bun.file("./dist/index.html"));
        }

        return new Response("Not Found", { status: 404 });
      },
    });

console.log(`[OK] Server listening on ${server.url}`);
