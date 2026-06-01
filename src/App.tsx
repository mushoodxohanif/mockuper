import { useState, useRef, type DragEvent, type RefObject, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Clock,
  Download,
  Maximize2,
  FileImage,
  Info,
} from "lucide-react";
import { MockupResult } from "./types";

export default function App() {
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [mockupPreview, setMockupPreview] = useState<string | null>(null);
  const emptyResult = (): MockupResult => ({
    imageUrl: null,
    loading: false,
    error: null,
    elapsedTime: null,
    instruction: null,
  });
  const [result, setResult] = useState<MockupResult>(emptyResult);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const productInputRef = useRef<HTMLInputElement>(null);
  const mockupInputRef = useRef<HTMLInputElement>(null);
  const [dragActiveProduct, setDragActiveProduct] = useState(false);
  const [dragActiveMockup, setDragActiveMockup] = useState(false);

  const handleProductUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setProductFile(file);
    const reader = new FileReader();
    reader.onload = () => setProductPreview(reader.result as string);
    reader.readAsDataURL(file);
    setResult(emptyResult());
  };

  const handleMockupUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
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
    if (productInputRef.current) productInputRef.current.value = "";
  };

  const clearMockup = () => {
    setMockupFile(null);
    setMockupPreview(null);
    if (mockupInputRef.current) mockupInputRef.current.value = "";
  };

  const generateMockup = async () => {
    if (!productFile || !mockupFile) return;
    const startTime = Date.now();
    setResult({ ...emptyResult(), loading: true, elapsedTime: 0 });

    const interval = setInterval(() => {
      setResult((prev) => ({
        ...prev,
        elapsedTime: Number(((Date.now() - startTime) / 1000).toFixed(1)),
      }));
    }, 100);

    try {
      const formData = new FormData();
      formData.append("product", productFile);
      formData.append("mockup", mockupFile);

      const response = await fetch("/api/process/mockup", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);
      const finalTime = Number(((Date.now() - startTime) / 1000).toFixed(1));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult({
        imageUrl: data.image,
        loading: false,
        error: null,
        elapsedTime: finalTime,
        instruction: data.instruction ?? null,
      });
    } catch (e: any) {
      clearInterval(interval);
      const finalTime = Number(((Date.now() - startTime) / 1000).toFixed(1));
      setResult({
        ...emptyResult(),
        error: e.message || "Failed to generate mockup.",
        elapsedTime: finalTime,
      });
    }
  };

  const canGenerate = Boolean(productFile && mockupFile && !result.loading);

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 border border-blue-500/20 rounded-full text-xs font-semibold text-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Product Mockup Replacer
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-4">
            Swap the dummy product for your real product
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3 max-w-2xl">
            Upload your product and a mockup scene. We generate a detailed Bria instruction from both images,
            then run Nano Banana 2 with that prompt — the same flow as gemini.google.com.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UploadPanel
            step="1"
            title="Product (Subject) Image"
            preview={productPreview}
            file={productFile}
            dragActive={dragActiveProduct}
            onDragOver={(e) => { e.preventDefault(); setDragActiveProduct(true); }}
            onDragLeave={() => setDragActiveProduct(false)}
            onDrop={(file) => { setDragActiveProduct(false); handleProductUpload(file); }}
            onBrowse={() => productInputRef.current?.click()}
            onClear={clearProduct}
            inputRef={productInputRef}
            onChange={(file) => handleProductUpload(file)}
            icon={<FileImage className="w-6 h-6" />}
          />

          <UploadPanel
            step="2"
            title="Mockup (Background) Scene"
            preview={mockupPreview}
            file={mockupFile}
            dragActive={dragActiveMockup}
            onDragOver={(e) => { e.preventDefault(); setDragActiveMockup(true); }}
            onDragLeave={() => setDragActiveMockup(false)}
            onDrop={(file) => { setDragActiveMockup(false); handleMockupUpload(file); }}
            onBrowse={() => mockupInputRef.current?.click()}
            onClear={clearMockup}
            inputRef={mockupInputRef}
            onChange={(file) => handleMockupUpload(file)}
            icon={<Upload className="w-6 h-6" />}
          />
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">How it works</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                Gemini writes a <strong>Bria instruction</strong> from your two photos, then{" "}
                <strong>Nano Banana 2</strong> (<code className="text-[11px]">gemini-3.1-flash-image</code>)
                renders the mockup using that prompt with both images attached. Requires{" "}
                <code className="text-[11px]">GEMINI_API_KEY</code>.
              </p>
            </div>
          </div>

          <button
            onClick={generateMockup}
            disabled={!canGenerate}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-semibold rounded-xl text-white shadow-md transition-all ${
              canGenerate
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            Generate Mockup
          </button>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Result</h3>
              <p className="text-[10px] text-slate-400">
                {result.imageUrl
                  ? "Rendered with Nano Banana 2"
                  : "Your generated mockup will appear here"}
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
                    Building Bria instruction, then Nano Banana 2…
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

            {!result.loading && !result.error && !result.imageUrl && (
              <p className="text-sm text-slate-400">Upload images and click Generate Mockup</p>
            )}

            {result.imageUrl && !result.loading && (
              <div className="w-full max-w-2xl space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-sm">
                  <img
                    src={result.imageUrl}
                    alt="Generated mockup"
                    className="w-full object-contain max-h-[420px]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                    <button
                      onClick={() => setModalImage(result.imageUrl!)}
                      className="p-2 rounded-lg bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                      title="Expand preview"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <a
                      href={result.imageUrl}
                      download="mockup-result.png"
                      className="p-2 rounded-lg bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>

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

                {mockupPreview && (
                  <div className="grid grid-cols-2 gap-4">
                    <CompareThumb label="Original mockup" src={mockupPreview} />
                    <CompareThumb label="Your product" src={productPreview!} />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {modalImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setModalImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={modalImage} alt="Expanded mockup" className="max-h-[85vh] object-contain w-full rounded-xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadPanel({
  step,
  title,
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

      <div
        className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px] transition-all ${
          dragActive ? "border-blue-500 bg-blue-50/20" : "border-slate-200 hover:border-slate-300"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.[0]) onDrop(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onChange(e.target.files[0]);
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
              <p className="text-xs text-slate-400 mt-1 font-mono">PNG, JPG, WebP up to 20MB</p>
            </div>
          </button>
        ) : (
          <div className="w-full flex flex-col items-center space-y-4">
            <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-[180px] bg-slate-50">
              <img src={preview} alt={title} className="object-contain w-full h-full max-h-[180px]" />
              <button
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
      </div>
    </div>
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
