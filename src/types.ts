export type GenerateMode = "instruction_only" | "full";

export interface UploadLimits {
  maxFileSizeBytes: number;
  maxTotalUploadBytes: number;
  maxFileSizeLabel: string;
  maxTotalUploadLabel: string;
  hostedOnVercel: boolean;
}

export interface MockupResult {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  elapsedTime: number | null;
  instruction: string | null;
  mode: GenerateMode | null;
}
