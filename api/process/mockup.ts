import { handleMockupRequest } from "../../lib/handle-mockup.js";

export async function POST(req: Request) {
  return handleMockupRequest(req);
}
