import { handleProductEditRequest } from "../../lib/handle-product-edit.js";

export async function POST(req: Request) {
  return handleProductEditRequest(req);
}
