import { handleUsageFeedbackRequest } from "@/lib/handle-usage-feedback";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleUsageFeedbackRequest(req, id);
}
