"use client";

import { useEffect } from "react";

type ImageModalProps = {
  imageUrl: string | null;
  closing: boolean;
  onClose: () => void;
};

export function ImageModal({ imageUrl, closing, onClose }: ImageModalProps) {
  useEffect(() => {
    if (!imageUrl) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closing) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [imageUrl, closing, onClose]);

  if (!imageUrl) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Expanded mockup preview"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        closing ? "animate-modal-fade-out" : "animate-modal-fade-in"
      }`}
    >
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className={`relative max-w-5xl w-full ${
          closing ? "animate-modal-scale-out" : "animate-modal-scale-in"
        }`}
      >
        <img
          src={imageUrl}
          alt="Expanded mockup"
          className="max-h-[85vh] object-contain w-full rounded-xl"
        />
      </div>
    </div>
  );
}
