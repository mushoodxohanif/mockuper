import { handleMockupRequest } from "@/lib/handle-mockup";

export const maxDuration = 60;

export async function POST(req: Request) {
  return handleMockupRequest(req);
}
