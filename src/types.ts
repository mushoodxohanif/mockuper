export type ProcessingMethod = "lifestyle" | "precise";

export interface MockupResult {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  elapsedTime: number | null;
  method: ProcessingMethod | null;
}
