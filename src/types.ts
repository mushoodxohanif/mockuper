export type GenerateMode = "instruction_only" | "full";

export interface MockupResult {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  elapsedTime: number | null;
  instruction: string | null;
  mode: GenerateMode | null;
}
