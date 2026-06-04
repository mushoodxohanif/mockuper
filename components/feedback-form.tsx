"use client";

import { AlertCircle, CheckCircle, ImagePlus, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { previewFile } from "@/components/ui/upload-utils";

type FeedbackSentiment = "positive" | "negative";

type FeedbackFormProps = {
  usageId: string;
  generatedImageUrl?: string | null;
  submitted: boolean;
  onSubmitted: () => void;
};

export function FeedbackForm({
  usageId,
  generatedImageUrl,
  submitted,
  onSubmitted,
}: FeedbackFormProps) {
  const [sentiment, setSentiment] = useState<FeedbackSentiment | null>(null);
  const [comment, setComment] = useState("");
  const [feedbackImageFile, setFeedbackImageFile] = useState<File | null>(null);
  const [feedbackImagePreview, setFeedbackImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRecorded, setAlreadyRecorded] = useState(false);
  const feedbackImageInputRef = useRef<HTMLInputElement>(null);

  const clearFeedbackImage = () => {
    setFeedbackImageFile(null);
    setFeedbackImagePreview(null);
    if (feedbackImageInputRef.current) {
      feedbackImageInputRef.current.value = "";
    }
  };

  const setFeedbackImage = (file: File) => {
    setFeedbackImageFile(file);
    previewFile(file, setFeedbackImagePreview);
  };

  const handleFeedbackImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, or WebP).");
      return;
    }
    setError(null);
    setFeedbackImage(file);
  };

  const attachGeneratedImage = async () => {
    if (!generatedImageUrl) {
      return;
    }

    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const extension = blob.type.split("/")[1] || "png";
      setFeedbackImage(
        new File([blob], `generated-result.${extension}`, { type: blob.type || "image/png" }),
      );
    } catch {
      setError("Could not attach the generated result.");
    }
  };

  const handleSubmit = async () => {
    if (!sentiment || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("sentiment", sentiment);
      if (comment.trim()) {
        formData.append("comment", comment.trim());
      }
      if (feedbackImageFile) {
        formData.append("image", feedbackImageFile);
      }

      const response = await fetch(`/api/usage/${usageId}/feedback`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        onSubmitted();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.status === 409) {
        setAlreadyRecorded(true);
        onSubmitted();
        return;
      }
      setError(data.error ?? "Could not submit feedback. Please try again.");
    } catch {
      setError("Could not submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted && !alreadyRecorded) {
    return (
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
        <p className="text-xs text-slate-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          Thanks for your feedback.
        </p>
      </div>
    );
  }

  if (alreadyRecorded) {
    return (
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
        <p className="text-xs text-slate-600">Feedback already recorded.</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 space-y-3 flex flex-col items-start justify-center">
      <p className="text-xs font-semibold text-slate-700">How was this result?</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSentiment("positive")}
          disabled={submitting}
          aria-pressed={sentiment === "positive"}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            sentiment === "positive"
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          Good
        </button>
        <button
          type="button"
          onClick={() => setSentiment("negative")}
          disabled={submitting}
          aria-pressed={sentiment === "negative"}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            sentiment === "negative"
              ? "border-rose-500 bg-rose-50 text-rose-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
          Needs work
        </button>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={submitting}
        placeholder="Optional: what worked or what should improve?"
        rows={2}
        maxLength={2000}
        className="w-full max-w-xl rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-y"
      />
      <div className="w-full max-w-xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-slate-600">
            Optional: attach the result you got from the Bria prompt
          </p>
          {generatedImageUrl && !feedbackImagePreview && (
            <button
              type="button"
              onClick={() => void attachGeneratedImage()}
              disabled={submitting}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 disabled:text-slate-400"
            >
              Use generated result
            </button>
          )}
        </div>
        {feedbackImagePreview ? (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
              <img
                src={feedbackImagePreview}
                alt="Feedback attachment preview"
                className="w-20 h-20 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs text-slate-700 truncate">
                {feedbackImageFile?.name ?? "Attached image"}
              </p>
              <button
                type="button"
                onClick={clearFeedbackImage}
                disabled={submitting}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 disabled:text-slate-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => feedbackImageInputRef.current?.click()}
            disabled={submitting}
            className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-left text-xs text-slate-500 hover:border-slate-400 hover:text-slate-600 disabled:text-slate-400 disabled:hover:border-slate-300"
          >
            <span className="inline-flex items-center gap-2">
              <ImagePlus className="w-4 h-4 shrink-0" />
              Upload an image (e.g. from gemini.google.com)
            </span>
          </button>
        )}
        <input
          ref={feedbackImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFeedbackImageUpload(file);
            }
          }}
        />
      </div>
      {error && (
        <p className="text-xs text-rose-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!sentiment || submitting}
        className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
          sentiment && !submitting
            ? "bg-slate-800 text-white hover:bg-slate-900 cursor-pointer"
            : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
      >
        {submitting ? "Submitting…" : "Submit feedback"}
      </button>
    </div>
  );
}
