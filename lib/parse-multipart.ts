import Busboy from "busboy";
import type { IncomingMessage } from "http";
import type { UploadFile } from "./mockup.js";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export interface MockupUploadFields {
  product?: UploadFile;
  mockup?: UploadFile;
}

export function parseMockupMultipart(
  req: IncomingMessage
): Promise<MockupUploadFields> {
  return new Promise((resolve, reject) => {
    const files: MockupUploadFields = {};

    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE },
    });

    busboy.on(
      "file",
      (
        name: string,
        stream: NodeJS.ReadableStream,
        info: { mimeType: string }
      ) => {
        const chunks: Buffer[] = [];
        let size = 0;

        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_FILE_SIZE) {
            reject(new Error("File exceeds 20MB limit"));
            stream.resume();
            return;
          }
          chunks.push(chunk);
        });

        stream.on("end", () => {
          if (name === "product" || name === "mockup") {
            files[name] = {
              buffer: Buffer.concat(chunks),
              mimetype: info.mimeType || "application/octet-stream",
            };
          }
        });
      }
    );

    busboy.on("finish", () => resolve(files));
    busboy.on("error", reject);
    req.pipe(busboy);
  });
}
