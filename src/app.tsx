import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  FileImage,
  FileText,
  Info,
  Maximize2,
  Play,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { type DragEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import type { GenerateMode, MockupResult, UploadLimits, Workflow } from "./types";

const FALLBACK_LIMITS: UploadLimits = {
  maxFileSizeBytes: 2 * 1024 * 1024,
  maxTotalUploadBytes: Math.floor(4.5 * 1024 * 1024 * 0.9),
  maxFileSizeLabel: "2 MB",
  maxTotalUploadLabel: "4 MB",
  hostedOnVercel: true,
};

export default function App() {
  const [workflow, setWorkflow] = useState<Workflow>("mockup");
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [mockupPreview, setMockupPreview] = useState<string | null>(null);
  const [editInstructions, setEditInstructions] = useState("");
  const [generateMode, setGenerateMode] = useState<GenerateMode>("full");
  const emptyResult = (): MockupResult => ({
    imageUrl: null,
    loading: false,
    error: null,
    elapsedTime: null,
    instruction: null,
    mode: null,
    workflow: null,
  });
  const [result, setResult] = useState<MockupResult>(emptyResult);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [modalClosing, setModalClosing] = useState(false);

  const closeModal = () => {
    if (!modalImage || modalClosing) {
      return;
    }
    setModalClosing(true);
    window.setTimeout(() => {
      setModalImage(null);
      setModalClosing(false);
    }, 200);
  };

  useEffect(() => {
    if (!modalImage) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !modalClosing) {
        setModalClosing(true);
        window.setTimeout(() => {
          setModalImage(null);
          setModalClosing(false);
        }, 200);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalImage, modalClosing]);

  const productInputRef = useRef<HTMLInputElement>(null);
  const mockupInputRef = useRef<HTMLInputElement>(null);
  const [dragActiveProduct, setDragActiveProduct] = useState(false);
  const [dragActiveMockup, setDragActiveMockup] = useState(false);
  const [uploadLimits, setUploadLimits] = useState<UploadLimits>(FALLBACK_LIMITS);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/limits")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UploadLimits | null) => {
        if (data?.maxFileSizeBytes) {
          setUploadLimits(data);
        }
      })
      .catch(() => {});
  }, []);

  const validateUpload = (file: File, otherFile: File | null): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Please upload an image file (PNG, JPG, or WebP).";
    }
    if (file.size > uploadLimits.maxFileSizeBytes) {
      return `Each image must be ${uploadLimits.maxFileSizeLabel} or smaller.`;
    }
    const combined = file.size + (otherFile?.size ?? 0);
    if (combined > uploadLimits.maxTotalUploadBytes) {
      return `Both images combined must stay under ${uploadLimits.maxTotalUploadLabel}.`;
    }
    return null;
  };

  const handleProductUpload = (file: File) => {
    const error = validateUpload(file, mockupFile);
    if (error) {
      setUploadError(error);
      return;
    }
    setUploadError(null);
    setProductFile(file);
    const reader = new FileReader();
    reader.onload = () => setProductPreview(reader.result as string);
    reader.readAsDataURL(file);
    setResult(emptyResult());
  };

  const handleMockupUpload = (file: File) => {
    const error = validateUpload(file, productFile);
    if (error) {
      setUploadError(error);
      return;
    }
    setUploadError(null);
    setMockupFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setMockupPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setResult(emptyResult());
  };

  const clearProduct = () => {
    setProductFile(null);
    setProductPreview(null);
    if (productInputRef.current) {
      productInputRef.current.value = "";
    }
  };

  const clearMockup = () => {
    setMockupFile(null);
    setMockupPreview(null);
    if (mockupInputRef.current) {
      mockupInputRef.current.value = "";
    }
  };

  const runGeneration = async (
    endpoint: string,
    buildFormData: () => FormData,
    errorFallback: string,
  ) => {
    const startTime = Date.now();
    setResult({
      ...emptyResult(),
      loading: true,
      elapsedTime: 0,
      mode: generateMode,
      workflow,
    });

    const interval = setInterval(() => {
      setResult((prev) => ({
        ...prev,
        elapsedTime: Number(((Date.now() - startTime) / 1000).toFixed(1)),
      }));
    }, 100);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: buildFormData(),
      });

      clearInterval(interval);
      const finalTime = Number(((Date.now() - startTime) / 1000).toFixed(1));

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error(
            workflow === "mockup"
              ? `Upload too large for this host. Use images under ${uploadLimits.maxFileSizeLabel} each (${uploadLimits.maxTotalUploadLabel} combined).`
              : `Upload too large for this host. Use an image under ${uploadLimits.maxFileSizeLabel}.`,
          );
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult({
        imageUrl: data.image ?? null,
        loading: false,
        error: null,
        elapsedTime: finalTime,
        instruction: data.instruction ?? null,
        mode: data.mode ?? generateMode,
        workflow,
      });
    } catch (error: unknown) {
      clearInterval(interval);
      const finalTime = Number(((Date.now() - startTime) / 1000).toFixed(1));
      const message = error instanceof Error ? error.message : errorFallback;
      setResult({
        ...emptyResult(),
        error: message,
        elapsedTime: finalTime,
        workflow,
      });
    }
  };

  const generateMockup = async () => {
    if (!productFile || !mockupFile) {
      return;
    }
    const sizeError =
      validateUpload(productFile, mockupFile) ?? validateUpload(mockupFile, productFile);
    if (sizeError) {
      setUploadError(sizeError);
      setResult({ ...emptyResult(), error: sizeError });
      return;
    }
    setUploadError(null);
    await runGeneration(
      "/api/process/mockup",
      () => {
        const formData = new FormData();
        formData.append("product", productFile);
        formData.append("mockup", mockupFile);
        formData.append("mode", generateMode);
        return formData;
      },
      "Failed to generate mockup.",
    );
  };

  const generateProductEdit = async () => {
    if (!productFile || !editInstructions.trim()) {
      return;
    }
    const sizeError = validateUpload(productFile, null);
    if (sizeError) {
      setUploadError(sizeError);
      setResult({ ...emptyResult(), error: sizeError });
      return;
    }
    setUploadError(null);
    await runGeneration(
      "/api/process/product-edit",
      () => {
        const formData = new FormData();
        formData.append("product", productFile);
        formData.append("instructions", editInstructions.trim());
        formData.append("mode", generateMode);
        return formData;
      },
      "Failed to process product edit.",
    );
  };

  const handleGenerate = () => {
    if (workflow === "mockup") {
      void generateMockup();
    } else {
      void generateProductEdit();
    }
  };

  const canGenerate =
    workflow === "mockup"
      ? Boolean(productFile && mockupFile && !result.loading)
      : Boolean(productFile && editInstructions.trim() && !result.loading);

  const switchWorkflow = (next: Workflow) => {
    setWorkflow(next);
    setUploadError(null);
    setResult(emptyResult());
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col antialiased">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg text-white font-bold text-base flex items-center justify-center">
              M
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Mockuper</h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Bria instruction + Nano Banana 2
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <section className="bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800/80">
          <div className="flex flex-wrap gap-2 mb-4">
            <WorkflowTab
              active={workflow === "mockup"}
              onClick={() => switchWorkflow("mockup")}
              label="Mockup swap"
            />
            <WorkflowTab
              active={workflow === "product_edit"}
              onClick={() => switchWorkflow("product_edit")}
              label="Product edit"
            />
          </div>
          {workflow === "mockup" ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 border border-blue-500/20 rounded-full text-xs font-semibold text-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                Product Mockup Replacer
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-4">
                Swap the dummy product for your real product
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3 max-w-2xl">
                Upload your product and a mockup scene. Generate only the Bria instruction, or run
                the full pipeline with Nano Banana 2 — same flow as gemini.google.com.
              </p>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/15 border border-violet-500/20 rounded-full text-xs font-semibold text-violet-200">
                <FileText className="w-3.5 h-3.5 text-violet-300" />
                Product Edit
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-4">
                Edit your product image with natural-language instructions
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3 max-w-2xl">
                Upload a product photo and describe what to change. AI writes a Bria instruction
                that preserves the product&apos;s color, shape, material, and texture — then Nano
                Banana 2 applies only your requested edits.
              </p>
            </>
          )}
        </section>

        {uploadLimits.hostedOnVercel && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            Hosted on Vercel: keep each image under {uploadLimits.maxFileSizeLabel} (
            {uploadLimits.maxTotalUploadLabel} combined). Larger files require self-hosting (
            <code className="font-mono text-[11px]">bun run start</code>).
          </p>
        )}

        {uploadError && (
          <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {uploadError}
          </p>
        )}

        <div
          className={`grid gap-6 ${workflow === "mockup" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
        >
          <UploadPanel
            step="1"
            title="Product (Subject) Image"
            maxFileSizeLabel={uploadLimits.maxFileSizeLabel}
            preview={productPreview}
            file={productFile}
            dragActive={dragActiveProduct}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActiveProduct(true);
            }}
            onDragLeave={() => setDragActiveProduct(false)}
            onDrop={(file) => {
              setDragActiveProduct(false);
              handleProductUpload(file);
            }}
            onBrowse={() => productInputRef.current?.click()}
            onClear={clearProduct}
            inputRef={productInputRef}
            onChange={(file) => handleProductUpload(file)}
            icon={<FileImage className="w-6 h-6" />}
          />

          {workflow === "mockup" ? (
            <UploadPanel
              step="2"
              title="Mockup (Background) Scene"
              maxFileSizeLabel={uploadLimits.maxFileSizeLabel}
              preview={mockupPreview}
              file={mockupFile}
              dragActive={dragActiveMockup}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActiveMockup(true);
              }}
              onDragLeave={() => setDragActiveMockup(false)}
              onDrop={(file) => {
                setDragActiveMockup(false);
                handleMockupUpload(file);
              }}
              onBrowse={() => mockupInputRef.current?.click()}
              onClear={clearMockup}
              inputRef={mockupInputRef}
              onChange={(file) => handleMockupUpload(file)}
              icon={<Upload className="w-6 h-6" />}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">Edit instructions</h3>
                </div>
                <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold">
                  REQUIRED
                </p>
              </div>
              <textarea
                value={editInstructions}
                onChange={(e) => {
                  setEditInstructions(e.target.value);
                  setResult(emptyResult());
                }}
                placeholder="e.g. Add credit cards and some cash inside the open wallet. Keep the wallet exactly as it is — same color, leather texture, shape, and stitching."
                rows={8}
                className="flex-1 min-h-[220px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-y"
              />
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                Describe only what should change. The Bria instruction will lock the product&apos;s
                intrinsic properties (color, shape, material, texture) unless you explicitly ask to
                change them.
              </p>
            </div>
          )}
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">What to generate</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                {workflow === "mockup" ? (
                  <>
                    <strong>Instruction only</strong> — Gemini writes the Bria instruction from your
                    photos (copy it to gemini.google.com if you like).{" "}
                    <strong>Instruction + image</strong> — same instruction, then Nano Banana 2
                    renders the final mockup.
                  </>
                ) : (
                  <>
                    <strong>Instruction only</strong> — Gemini writes a preservation-aware Bria
                    instruction from your product photo and edit notes.{" "}
                    <strong>Instruction + image</strong> — same instruction, then Nano Banana 2
                    edits the product image.
                  </>
                )}{" "}
                Requires <code className="text-[11px]">GEMINI_API_KEY</code>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GenerateModeOption
              selected={generateMode === "instruction_only"}
              onSelect={() => setGenerateMode("instruction_only")}
              title="Instruction only"
              description={
                workflow === "mockup"
                  ? "Bria instruction from your two images — no render."
                  : "Bria instruction from product + your edit notes — no render."
              }
              icon={<FileText className="w-4 h-4" />}
            />
            <GenerateModeOption
              selected={generateMode === "full"}
              onSelect={() => setGenerateMode("full")}
              title={workflow === "mockup" ? "Instruction + mockup" : "Instruction + image"}
              description="Bria instruction, then Nano Banana 2 final image."
              icon={<Sparkles className="w-4 h-4" />}
              recommended
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-semibold rounded-xl text-white shadow-md transition-all ${
              canGenerate
                ? workflow === "mockup"
                  ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  : "bg-violet-600 hover:bg-violet-700 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            {generateMode === "instruction_only"
              ? "Generate instruction"
              : workflow === "mockup"
                ? "Generate instruction + mockup"
                : "Generate instruction + image"}
          </button>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Result</h3>
              <p className="text-[10px] text-slate-400">
                {result.loading
                  ? generateMode === "instruction_only"
                    ? "Writing Bria instruction…"
                    : "Bria instruction, then Nano Banana 2…"
                  : result.imageUrl
                    ? result.workflow === "product_edit"
                      ? "Instruction + edited image (Nano Banana 2)"
                      : "Instruction + mockup (Nano Banana 2)"
                    : result.instruction
                      ? "Bria instruction ready"
                      : workflow === "product_edit"
                        ? "Upload a product and add edit instructions"
                        : "Results will appear here"}
              </p>
            </div>
            {result.elapsedTime !== null && !result.loading && (
              <span className="text-[11px] font-mono bg-blue-50 text-blue-700 font-semibold border border-blue-100 px-2 py-1 rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {result.elapsedTime}s
              </span>
            )}
          </div>

          <div className="p-6 min-h-[320px] flex items-center justify-center bg-slate-50/30 relative">
            {result.loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-4 z-10">
                <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    {generateMode === "instruction_only"
                      ? "Building Bria instruction…"
                      : "Building Bria instruction, then Nano Banana 2…"}
                  </p>
                  <p className="text-xs font-mono text-blue-600 mt-1">{result.elapsedTime}s</p>
                </div>
              </div>
            )}

            {!result.loading && result.error && (
              <div className="text-center space-y-3 p-4 bg-rose-50 border border-rose-100 rounded-xl max-w-md">
                <AlertCircle className="w-7 h-7 mx-auto text-rose-500" />
                <p className="text-sm font-bold text-rose-800">Generation failed</p>
                <p className="text-xs text-rose-600 leading-relaxed">{result.error}</p>
              </div>
            )}

            {!result.loading && !result.error && !result.imageUrl && !result.instruction && (
              <p className="text-sm text-slate-400">
                {workflow === "mockup"
                  ? "Upload images and choose what to generate"
                  : "Upload a product image, add edit instructions, and generate"}
              </p>
            )}

            {!result.loading && !result.error && (result.imageUrl || result.instruction) && (
              <div className="w-full max-w-2xl space-y-4">
                {result.imageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-sm">
                    <img
                      src={result.imageUrl}
                      alt={
                        result.workflow === "product_edit" ? "Edited product" : "Generated mockup"
                      }
                      className="w-full object-contain max-h-[420px]"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (result.imageUrl) {
                            setModalImage(result.imageUrl);
                          }
                        }}
                        className="p-2 rounded-lg bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                        title="Expand preview"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <a
                        href={result.imageUrl}
                        download={
                          result.workflow === "product_edit"
                            ? "product-edit-result.png"
                            : "mockup-result.png"
                        }
                        className="p-2 rounded-lg bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {result.instruction && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Bria instruction
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {result.instruction}
                    </p>
                  </div>
                )}

                {productPreview &&
                  (workflow === "mockup" && mockupPreview ? (
                    <div className="grid grid-cols-2 gap-4">
                      <CompareThumb label="Original mockup" src={mockupPreview} />
                      <CompareThumb label="Your product" src={productPreview} />
                    </div>
                  ) : result.imageUrl ? (
                    <div className="grid grid-cols-2 gap-4">
                      <CompareThumb label="Original product" src={productPreview} />
                      <CompareThumb label="Edited result" src={result.imageUrl} />
                    </div>
                  ) : (
                    <CompareThumb label="Original product" src={productPreview} />
                  ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {modalImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded mockup preview"
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
            modalClosing ? "animate-modal-fade-out" : "animate-modal-fade-in"
          }`}
        >
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={closeModal}
          />
          <div
            className={`relative max-w-5xl w-full ${
              modalClosing ? "animate-modal-scale-out" : "animate-modal-scale-in"
            }`}
          >
            <img
              src={modalImage}
              alt="Expanded mockup"
              className="max-h-[85vh] object-contain w-full rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function UploadPanel({
  step,
  title,
  maxFileSizeLabel,
  preview,
  file,
  dragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowse,
  onClear,
  inputRef,
  onChange,
  icon,
}: {
  step: string;
  title: string;
  maxFileSizeLabel: string;
  preview: string | null;
  file: File | null;
  dragActive: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (file: File) => void;
  onBrowse: () => void;
  onClear: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (file: File) => void;
  icon: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
            {step}
          </span>
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
        </div>
        <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold">
          REQUIRED
        </p>
      </div>

      <section
        aria-label={`${title} upload area`}
        className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px] transition-all ${
          dragActive ? "border-blue-500 bg-blue-50/20" : "border-slate-200 hover:border-slate-300"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.[0]) {
            onDrop(e.dataTransfer.files[0]);
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              onChange(e.target.files[0]);
            }
          }}
        />

        {!preview ? (
          <button
            type="button"
            onClick={onBrowse}
            className="cursor-pointer text-center space-y-3 flex flex-col items-center py-4 w-full"
          >
            <div className="p-3.5 bg-slate-100 rounded-full text-slate-500">{icon}</div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                Drag & drop or <span className="text-blue-600 font-semibold">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                PNG, JPG, WebP up to {maxFileSizeLabel}
              </p>
            </div>
          </button>
        ) : (
          <div className="w-full flex flex-col items-center space-y-4">
            <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-[180px] bg-slate-50">
              <img
                src={preview}
                alt={title}
                className="object-contain w-full h-full max-h-[180px]"
              />
              <button
                type="button"
                onClick={onClear}
                className="absolute top-2 right-2 p-1.5 bg-white/90 border border-slate-200 rounded-full text-rose-500 hover:bg-rose-500 hover:text-white cursor-pointer"
                title="Remove image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60">
              <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
              {file?.name} ({((file?.size ?? 0) / (1024 * 1024)).toFixed(2)} MB)
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function GenerateModeOption({
  selected,
  onSelect,
  title,
  description,
  icon,
  recommended = false,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  icon: ReactNode;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
        selected
          ? "border-blue-500 bg-blue-50/50 shadow-sm"
          : "border-slate-200 hover:border-slate-300 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className={selected ? "text-blue-600" : "text-slate-500"}>{icon}</span>
        {title}
        {recommended && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
            Recommended
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
    </button>
  );
}

function WorkflowTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function CompareThumb({ label, src }: { label: string; src: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <img src={src} alt={label} className="w-full h-24 object-contain bg-slate-50" />
      </div>
    </div>
  );
}
