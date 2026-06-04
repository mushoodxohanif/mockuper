export type GenerateMode = "instruction_only" | "full";

export type Workflow = "mockup" | "product_edit";

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
  workflow: Workflow | null;
  usageId: string | null;
  feedbackSubmitted: boolean;
}

export type ReferenceImage = {
  id: string;
  file: File;
  preview: string;
};

export const MAX_REFERENCE_IMAGES = 5;

export function emptyMockupResult(): MockupResult {
  return {
    imageUrl: null,
    loading: false,
    error: null,
    elapsedTime: null,
    instruction: null,
    mode: null,
    workflow: null,
    usageId: null,
    feedbackSubmitted: false,
  };
}
