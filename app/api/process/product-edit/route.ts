import { handleProductEditRequest } from "@/lib/handle-product-edit";

export const maxDuration = 60;

export async function POST(req: Request) {
  return handleProductEditRequest(req);
}
