export interface ServiceResult {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  elapsedTime: number | null; // in seconds
}

export type ServiceName = "picsart" | "photoroom" | "bria";

export interface ServiceResults {
  picsart: ServiceResult;
  photoroom: ServiceResult;
  bria: ServiceResult;
}

export interface Review {
  masking: string;
  lighting: string;
  perspective: string;
  summary: string;
}

export interface GeminiCritique {
  scores: {
    picsart: number;
    photoroom: number;
    bria: number;
  };
  verdict: string;
  reviews: {
    picsart: Review;
    photoroom: Review;
    bria: Review;
  };
}
