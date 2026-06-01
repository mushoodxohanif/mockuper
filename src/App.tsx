import { useState, useRef, useEffect } from "react";
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
  Layers, 
  Check, 
  Info, 
  ArrowRight,
  TrendingUp,
  FileImage,
  Flame
} from "lucide-react";
import { ServiceName, ServiceResults, GeminiCritique } from "./types";

export default function App() {
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [mockupPreview, setMockupPreview] = useState<string | null>(null);

  // Individual states for evaluating service speed, errors, images
  const [results, setResults] = useState<ServiceResults>({
    picsart: { imageUrl: null, loading: false, error: null, elapsedTime: null },
    photoroom: { imageUrl: null, loading: false, error: null, elapsedTime: null },
    bria: { imageUrl: null, loading: false, error: null, elapsedTime: null }
  });

  // State for modal preview of a generated result
  const [modalImage, setModalImage] = useState<{ src: string; title: string } | null>(null);

  // Gemini expert analysis
  const [critique, setCritique] = useState<GeminiCritique | null>(null);
  const [isCritiquing, setIsCritiquing] = useState<boolean>(false);
  const [critiqueError, setCritiqueError] = useState<string | null>(null);

  const productInputRef = useRef<HTMLInputElement>(null);
  const mockupInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop State helpers
  const [dragActiveProduct, setDragActiveProduct] = useState(false);
  const [dragActiveMockup, setDragActiveMockup] = useState(false);

  // File Upload Handlers
  const handleProductUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setProductFile(file);
    const reader = new FileReader();
    reader.onload = () => setProductPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleMockupUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setMockupFile(file);
    const reader = new FileReader();
    reader.onload = () => setMockupPreview(reader.result as string);
    reader.readAsDataURL(file);
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

  // Concurrent Execution trigger for all 3 sandbox environments
  const runComparison = async () => {
    if (!productFile || !mockupFile) return;

    // Reset comparative outputs
    setResults({
      picsart: { imageUrl: null, loading: true, error: null, elapsedTime: 0 },
      photoroom: { imageUrl: null, loading: true, error: null, elapsedTime: 0 },
      bria: { imageUrl: null, loading: true, error: null, elapsedTime: 0 }
    });
    setCritique(null);
    setCritiqueError(null);

    // Concurrently ignite pipelines
    executeService("picsart");
    executeService("photoroom");
    executeService("bria");
  };

  const executeService = async (name: ServiceName) => {
    const startTime = Date.now();
    
    // Smooth timer countdown ticker
    const interval = setInterval(() => {
      setResults(prev => ({
        ...prev,
        [name]: {
          ...prev[name],
          elapsedTime: Number(((Date.now() - startTime) / 1000).toFixed(1))
        }
      }));
    }, 100);

    try {
      const formData = new FormData();
      formData.append("product", productFile!);
      formData.append("mockup", mockupFile!);

      const response = await fetch(`/api/process/${name}`, {
        method: "POST",
        body: formData
      });

      clearInterval(interval);
      const finalTime = Number(((Date.now() - startTime) / 1000).toFixed(1));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed with code ${response.status}`);
      }

      const result = await response.json();
      setResults(prev => ({
        ...prev,
        [name]: {
          imageUrl: result.image,
          loading: false,
          error: null,
          elapsedTime: finalTime
        }
      }));

    } catch (e: any) {
      clearInterval(interval);
      const finalTime = Number(((Date.now() - startTime) / 1000).toFixed(1));
      setResults(prev => ({
        ...prev,
        [name]: {
          imageUrl: null,
          loading: false,
          error: e.message || "An unresolved transmission exception occurred.",
          elapsedTime: finalTime
        }
      }));
    }
  };

  // Multimodal Gemini feedback side-by-side analysis
  const requestGeminiCritique = async () => {
    setIsCritiquing(true);
    setCritiqueError(null);
    try {
      const response = await fetch("/api/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          picsartImg: results.picsart.imageUrl,
          photoroomImg: results.photoroom.imageUrl,
          briaImg: results.bria.imageUrl,
          originalProductImg: productPreview,
          originalMockupImg: mockupPreview
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Gemini refused comparison critique request.");
      }

      const data = await response.json();
      setCritique(data);
    } catch (e: any) {
      setCritiqueError(e.message || "Could not retrieve Gemini critique.");
    } finally {
      setIsCritiquing(false);
    }
  };

  // Helper is any result active
  const hasResult = results.picsart.imageUrl || results.photoroom.imageUrl || results.bria.imageUrl;
  const isFinished = !results.picsart.loading && !results.photoroom.loading && !results.bria.loading && (results.picsart.imageUrl || results.photoroom.imageUrl || results.bria.imageUrl);

  const scores = critique?.scores;
  const highestScore = scores ? Math.max(scores.picsart, scores.photoroom, scores.bria) : 0;
  
  const isWinner = (name: ServiceName) => {
    if (!critique || !scores) return false;
    return scores[name] === highestScore;
  };

  const getCardStyle = (name: ServiceName) => {
    const base = "bg-white overflow-hidden flex flex-col transition-all duration-300 relative";
    if (isWinner(name)) {
      return `${base} rounded-xl border-2 border-blue-500 shadow-lg scale-[1.02] transform z-10`;
    }
    return `${base} rounded-xl border border-slate-200 shadow-sm`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col antialiased">
      {/* Sleek, Architectural Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 transition-all duration-300 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg text-white font-bold text-base flex items-center justify-center shadow-xs shadow-blue-600/10 hover:scale-105 transition-transform">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  MockupCompare AI
                </h1>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100 font-sans">
                  Beta v1.4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium font-sans">
                Real-time placement comparison bench for Picsart, Photoroom, & Bria AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200/60">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Systems Active
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Step-by-Step Instructions Panel */}
        <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden border border-slate-800/80">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-blue-600/10 via-transparent to-transparent pointer-events-none"></div>
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 border border-blue-500/20 rounded-full text-xs font-semibold text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              Engine Comparison Sandbox
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Compare AI Product Placement Side-by-Side
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Upload your product image and mockup background image. Watch the mockup placement engines generate simultaneously as real-time speed metrics are captured, then get an expert critique from Gemini 2.5 on quality components!
            </p>
          </div>
        </section>

        {/* Input Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Image Asset Upload Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Product (Subject) Image</h3>
              </div>
              <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold">
                REQUIRED
              </p>
            </div>

            <div 
              className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px] transition-all relative ${
                dragActiveProduct ? "border-blue-500 bg-blue-50/20" : "border-slate-200 hover:border-slate-300"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActiveProduct(true); }}
              onDragLeave={() => setDragActiveProduct(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActiveProduct(false);
                if (e.dataTransfer.files?.[0]) handleProductUpload(e.dataTransfer.files[0]);
              }}
            >
              <input
                ref={productInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleProductUpload(e.target.files[0]);
                }}
              />

              {!productPreview ? (
                <div 
                  onClick={() => productInputRef.current?.click()}
                  className="cursor-pointer text-center space-y-3 flex flex-col items-center py-4 w-full"
                >
                  <div className="p-3.5 bg-slate-100 rounded-full text-slate-500 hover:scale-105 transition-transform duration-300">
                    <FileImage className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-750">
                      Drag & drop image or <span className="text-blue-600 font-semibold hover:underline">browse</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      PNG, JPG, WebP up to 20MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center space-y-4 relative group">
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-[180px] bg-slate-50">
                    <img 
                      src={productPreview} 
                      alt="Product Preview" 
                      className="object-contain w-full h-full max-h-[180px]"
                    />
                    <button 
                      onClick={clearProduct}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full text-rose-500 hover:bg-rose-500 hover:text-white hover:scale-105 shadow-sm transition-all duration-200 cursor-pointer"
                      title="Remove product image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                    {productFile?.name} ({(productFile!.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mockup Scene Image Asset Upload Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Mockup (Background) Scene</h3>
              </div>
              <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold">
                REQUIRED
              </p>
            </div>

            <div 
              className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px] transition-all relative ${
                dragActiveMockup ? "border-blue-500 bg-blue-50/20" : "border-slate-200 hover:border-slate-300"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActiveMockup(true); }}
              onDragLeave={() => setDragActiveMockup(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActiveMockup(false);
                if (e.dataTransfer.files?.[0]) handleMockupUpload(e.dataTransfer.files[0]);
              }}
            >
              <input
                ref={mockupInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleMockupUpload(e.target.files[0]);
                }}
              />

              {!mockupPreview ? (
                <div 
                  onClick={() => mockupInputRef.current?.click()}
                  className="cursor-pointer text-center space-y-3 flex flex-col items-center py-4 w-full"
                >
                  <div className="p-3.5 bg-slate-100 rounded-full text-slate-500 hover:scale-105 transition-transform duration-300">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-750">
                      Drag & drop image or <span className="text-blue-600 font-semibold hover:underline">browse</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      PNG, JPG, WebP up to 20MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center space-y-4 relative group">
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-[180px] bg-slate-50">
                    <img 
                      src={mockupPreview} 
                      alt="Mockup Preview" 
                      className="object-contain w-full h-full max-h-[180px]"
                    />
                    <button 
                      onClick={clearMockup}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full text-rose-500 hover:bg-rose-500 hover:text-white hover:scale-105 shadow-sm transition-all duration-200 cursor-pointer"
                      title="Remove mockup background image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                    {mockupFile?.name} ({(mockupFile!.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Engine Synthesize Control Hub */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600 flex items-center justify-center mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Sandbox Configuration Parameters</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                The mockups are generated concurrently across Picsart, Photoroom, and Bria using pre-configured developer API integrations. No external signup or local keys are required.
              </p>
            </div>
          </div>

          <button
            onClick={runComparison}
            disabled={!productFile || !mockupFile || results.picsart.loading || results.photoroom.loading || results.bria.loading}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-semibold rounded-xl text-white shadow-md transition-all duration-300 ${
              productFile && mockupFile && !results.picsart.loading
                ? "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 shadow-blue-500/10 cursor-pointer"
                : "bg-slate-200 text-slate-400 border border-slate-300 shadow-none cursor-not-allowed"
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            Commingle & Compare Engines
          </button>
        </section>

        {/* Comparative Lab View */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Active Engine Render Labs</h3>
            <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              Real-time Performance Ticker
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Picsart Service Output Frame */}
            <motion.div 
              className={getCardStyle("picsart")}
              layout
            >
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Picsart Engine</h4>
                  <p className="text-[10px] text-slate-400 font-medium font-sans">Background Placement Beta</p>
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
                  isWinner("picsart") 
                    ? "bg-green-500 text-white border-green-500" 
                    : "bg-slate-100 text-slate-600 border-slate-200/80"
                }`}>
                  {isWinner("picsart") ? "WINNER" : "Picsart API"}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col min-h-[300px] justify-center items-center relative bg-slate-50/20">
                {results.picsart.loading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-4 p-4 text-center z-10">
                    <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin"></div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Processing on Picsart...</p>
                      <p className="text-[10px] font-mono text-blue-600 mt-1 tracking-wider bg-blue-50 border border-blue-100/60 px-2 py-0.5 rounded">
                        Timer: {results.picsart.elapsedTime}s
                      </p>
                    </div>
                  </div>
                )}

                {!results.picsart.loading && !results.picsart.imageUrl && !results.picsart.error && (
                  <div className="text-center text-slate-400 space-y-2 p-4">
                    <Layers className="w-8 h-8 mx-auto stroke-1.5 opacity-50" />
                    <p className="text-xs font-semibold">Ready for comparison</p>
                  </div>
                )}

                {results.picsart.error && (
                  <div className="text-center space-y-3 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                    <AlertCircle className="w-7 h-7 mx-auto text-rose-500" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-rose-800">API rejected transfer</p>
                      <p className="text-[11px] text-rose-600 font-medium leading-relaxed max-w-[240px] break-words">
                        {results.picsart.error}
                      </p>
                    </div>
                  </div>
                )}

                {results.picsart.imageUrl && (
                  <div className="w-full h-full flex flex-col items-center justify-between space-y-4">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 max-h-[220px] bg-slate-50 group shadow-sm flex items-center justify-center">
                      {mockupPreview && (
                        <img 
                          src={mockupPreview} 
                          alt="Mockup Background" 
                          className="absolute inset-x-0 inset-y-0 w-full h-full object-cover opacity-85"
                        />
                      )}
                      <img 
                        src={results.picsart.imageUrl} 
                        alt="Picsart Output" 
                        className="object-contain w-full h-full max-h-[220px] mx-auto relative z-10 p-2"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1.5">
                        <button 
                          onClick={() => setModalImage({ src: results.picsart.imageUrl!, title: "Picsart Output" })}
                          className="p-1 rounded bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                          title="Open expanded preview"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <a 
                          href={results.picsart.imageUrl} 
                          download="picsart-mockup.png"
                          className="p-1 rounded bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                          title="Download result image"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {results.picsart.imageUrl && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Edge Precision</span>
                    <span className="text-[11px] font-bold text-slate-700">
                      {critique ? `${critique.scores.picsart * 10}%` : "--"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: critique ? `${critique.scores.picsart * 10}%` : "0%" }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-2.5 pt-2 border-t border-slate-100">
                    <span className="font-medium text-slate-400">Benchmark speed</span>
                    <span className="font-mono bg-blue-50 text-blue-700 font-semibold border border-blue-100 px-1.5 py-0.5 rounded">
                      {results.picsart.elapsedTime} seconds
                    </span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Photoroom Service Output Frame */}
            <motion.div 
              className={getCardStyle("photoroom")}
              layout
            >
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Photoroom Engine</h4>
                  <p className="text-[10px] text-slate-400 font-medium font-sans">Segment & Composite v1</p>
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
                  isWinner("photoroom") 
                    ? "bg-green-500 text-white border-green-500" 
                    : "bg-slate-100 text-slate-600 border-slate-200/80"
                }`}>
                  {isWinner("photoroom") ? "WINNER" : "Photoroom API"}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col min-h-[300px] justify-center items-center relative bg-slate-50/20">
                {results.photoroom.loading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-4 p-4 text-center z-10">
                    <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin"></div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Processing on Photoroom...</p>
                      <p className="text-[10px] font-mono text-blue-600 mt-1 tracking-wider bg-blue-50 border border-blue-100/60 px-2 py-0.5 rounded">
                        Timer: {results.photoroom.elapsedTime}s
                      </p>
                    </div>
                  </div>
                )}

                {!results.photoroom.loading && !results.photoroom.imageUrl && !results.photoroom.error && (
                  <div className="text-center text-slate-400 space-y-2 p-4">
                    <Layers className="w-8 h-8 mx-auto stroke-1.5 opacity-50" />
                    <p className="text-xs font-semibold">Ready for comparison</p>
                  </div>
                )}

                {results.photoroom.error && (
                  <div className="text-center space-y-3 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                    <AlertCircle className="w-7 h-7 mx-auto text-rose-500" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-rose-800">API rejected transfer</p>
                      <p className="text-[11px] text-rose-600 font-medium leading-relaxed max-w-[240px] break-words">
                        {results.photoroom.error}
                      </p>
                    </div>
                  </div>
                )}

                {results.photoroom.imageUrl && (
                  <div className="w-full h-full flex flex-col items-center justify-between space-y-4">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 max-h-[220px] bg-white group shadow-sm">
                      <img 
                        src={results.photoroom.imageUrl} 
                        alt="Photoroom Output" 
                        className="object-contain w-full h-full max-h-[220px] mx-auto"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1.5">
                        <button 
                          onClick={() => setModalImage({ src: results.photoroom.imageUrl!, title: "Photoroom Output" })}
                          className="p-1 rounded bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                          title="Open expanded preview"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <a 
                          href={results.photoroom.imageUrl} 
                          download="photoroom-mockup.png"
                          className="p-1 rounded bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                          title="Download result image"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {results.photoroom.imageUrl && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Edge Precision</span>
                    <span className="text-[11px] font-bold text-slate-700">
                      {critique ? `${critique.scores.photoroom * 10}%` : "--"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: critique ? `${critique.scores.photoroom * 10}%` : "0%" }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-2.5 pt-2 border-t border-slate-100">
                    <span className="font-medium text-slate-400">Benchmark speed</span>
                    <span className="font-mono bg-blue-50 text-blue-700 font-semibold border border-blue-100 px-1.5 py-0.5 rounded">
                      {results.photoroom.elapsedTime} seconds
                    </span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Bria AI Service Output Frame */}
            <motion.div 
              className={getCardStyle("bria")}
              layout
            >
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Bria AI Engine</h4>
                  <p className="text-[10px] text-slate-400 font-medium font-sans">Inpaint & Placement v1</p>
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
                  isWinner("bria") 
                    ? "bg-green-500 text-white border-green-500" 
                    : "bg-slate-100 text-slate-600 border-slate-200/80"
                }`}>
                  {isWinner("bria") ? "WINNER" : "Bria AI"}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col min-h-[300px] justify-center items-center relative bg-slate-50/20">
                {results.bria.loading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-4 p-4 text-center z-10">
                    <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin"></div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Processing on Bria AI...</p>
                      <p className="text-[10px] font-mono text-blue-600 mt-1 tracking-wider bg-blue-50 border border-blue-100/60 px-2 py-0.5 rounded">
                        Timer: {results.bria.elapsedTime}s
                      </p>
                    </div>
                  </div>
                )}

                {!results.bria.loading && !results.bria.imageUrl && !results.bria.error && (
                  <div className="text-center text-slate-400 space-y-2 p-4">
                    <Layers className="w-8 h-8 mx-auto stroke-1.5 opacity-50" />
                    <p className="text-xs font-semibold">Ready for comparison</p>
                  </div>
                )}

                {results.bria.error && (
                  <div className="text-center space-y-3 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                    <AlertCircle className="w-7 h-7 mx-auto text-rose-500" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-rose-800">API rejected transfer</p>
                      <p className="text-[11px] text-rose-600 font-medium leading-relaxed max-w-[240px] break-words">
                        {results.bria.error}
                      </p>
                    </div>
                  </div>
                )}

                {results.bria.imageUrl && (
                  <div className="w-full h-full flex flex-col items-center justify-between space-y-4">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 max-h-[220px] bg-white group shadow-sm">
                      <img 
                        src={results.bria.imageUrl} 
                        alt="Bria AI Output" 
                        className="object-contain w-full h-full max-h-[220px] mx-auto"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1.5">
                        <button 
                          onClick={() => setModalImage({ src: results.bria.imageUrl!, title: "Bria AI Output" })}
                          className="p-1 rounded bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                          title="Open expanded preview"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <a 
                          href={results.bria.imageUrl} 
                          download="bria-mockup.png"
                          className="p-1 rounded bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 cursor-pointer"
                          title="Download result image"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {results.bria.imageUrl && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Edge Precision</span>
                    <span className="text-[11px] font-bold text-slate-700">
                      {critique ? `${critique.scores.bria * 10}%` : "--"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: critique ? `${critique.scores.bria * 10}%` : "0%" }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-2.5 pt-2 border-t border-slate-100">
                    <span className="font-medium text-slate-400">Benchmark speed</span>
                    <span className="font-mono bg-blue-50 text-blue-700 font-semibold border border-blue-100 px-1.5 py-0.5 rounded">
                      {results.bria.elapsedTime} seconds
                    </span>
                  </div>
                </div>
              )}
            </motion.div>

          </div>

          {/* Analytics Summary Footer */}
          {hasResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-slate-800 rounded-xl flex flex-col md:flex-row items-stretch p-6 gap-6 md:gap-10 text-white shadow-md border border-slate-700/50"
            >
              <div className="flex flex-col justify-center min-w-[150px]">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">Avg. Processing Time</span>
                <span className="text-2xl font-mono font-bold text-blue-400 mt-1">
                  {(() => {
                    const rList = Object.values(results) as Array<{ imageUrl: string | null; loading: boolean; error: string | null; elapsedTime: number | null }>;
                    const times = rList.filter(r => r.elapsedTime !== null && !r.loading).map(r => r.elapsedTime!);
                    return times.length > 0 ? `${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)}s` : "--";
                  })()}
                </span>
              </div>
              <div className="hidden md:block w-px bg-slate-700 self-stretch"></div>
              <div className="flex flex-col justify-center min-w-[120px]">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">Success Rate</span>
                <span className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                  {(() => {
                    const rList = Object.values(results) as Array<{ imageUrl: string | null; loading: boolean; error: string | null; elapsedTime: number | null }>;
                    const filtered = rList.filter(r => !r.loading);
                    const successes = filtered.filter(r => r.imageUrl !== null).length;
                    return filtered.length > 0 ? `${((successes / filtered.length) * 100).toFixed(0)}%` : "100%";
                  })()}
                </span>
              </div>
              <div className="hidden md:block w-px bg-slate-700 self-stretch"></div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">Batch Pipeline Load</span>
                  <span className="text-[9px] text-blue-400 uppercase tracking-widest font-extrabold">Optimized</span>
                </div>
                <div className="flex gap-1 h-3.5">
                  <div className="flex-1 bg-blue-600 rounded-xs"></div>
                  <div className="flex-1 bg-blue-600 rounded-xs"></div>
                  <div className="flex-1 bg-blue-500 rounded-xs"></div>
                  <div className="flex-1 bg-blue-500 rounded-xs"></div>
                  <div className={`flex-1 rounded-xs transition-colors duration-500 ${isFinished ? 'bg-blue-400' : 'bg-slate-700'}`}></div>
                  <div className={`flex-1 rounded-xs transition-colors duration-500 ${isFinished ? 'bg-blue-400' : 'bg-slate-700'}`}></div>
                  <div className={`flex-1 rounded-xs transition-colors duration-500 ${isFinished ? 'bg-blue-300' : 'bg-slate-700'}`}></div>
                  <div className={`flex-1 rounded-xs transition-colors duration-500 ${isFinished ? 'bg-blue-205' : 'bg-slate-700'}`}></div>
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Gemini Executive Assessment Section */}
        {isFinished && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Gemini Multiservice AI Review</h3>
                  <p className="text-xs text-slate-500">Expert side-by-side analysis of mask, perspective, and color integration</p>
                </div>
              </div>

              {!critique && (
                <button
                  onClick={requestGeminiCritique}
                  disabled={isCritiquing}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isCritiquing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                      Assembling Critique...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-blue-100" />
                      Generate AI Scorecard
                    </>
                  )}
                </button>
              )}
            </div>

            {critiqueError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Evaluation Failure</span>: {critiqueError}
                </div>
              </div>
            )}

            {critique && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Scorecards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Picsart Card */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-slate-800 text-sm tracking-tight">Picsart Score</span>
                      <span className="text-2xl font-black text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl font-sans">
                        {critique.scores.picsart}/10
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-slate-500">Masking:</span>
                        <p className="text-slate-700 font-medium leading-relaxed mt-0.5">{critique.reviews.picsart.masking}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Lighting:</span>
                        <p className="text-slate-700 font-medium leading-relaxed mt-0.5">{critique.reviews.picsart.lighting}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Placement:</span>
                        <p className="text-slate-700 font-medium leading-relaxed mt-0.5">{critique.reviews.picsart.perspective}</p>
                      </div>
                    </div>
                  </div>

                  {/* Photoroom Card */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-slate-800 text-sm tracking-tight">Photoroom Score</span>
                      <span className="text-2xl font-black text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl font-sans">
                        {critique.scores.photoroom}/10
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-slate-500">Masking:</span>
                        <p className="text-slate-700 font-medium leading-relaxed mt-0.5">{critique.reviews.photoroom.masking}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Lighting:</span>
                        <p className="text-slate-700 font-medium leading-relaxed mt-0.5">{critique.reviews.photoroom.lighting}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Placement:</span>
                        <p className="text-slate-700 font-medium leading-relaxed mt-0.5">{critique.reviews.photoroom.perspective}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bria AI Card */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-slate-800 text-sm tracking-tight">Bria AI Score</span>
                      <span className="text-2xl font-black text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl font-sans">
                        {critique.scores.bria}/10
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-slate-500">Masking:</span>
                        <p className="text-slate-700 font-medium leading-relaxed mt-0.5">{critique.reviews.bria.masking}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Lighting:</span>
                        <p className="text-slate-700 font-medium leading-relaxed mt-0.5">{critique.reviews.bria.lighting}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Placement:</span>
                        <p className="text-slate-700 font-medium leading-relaxed mt-0.5">{critique.reviews.bria.perspective}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consolidated Verdict */}
                <div className="p-5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <TrendingUp className="w-4.5 h-4.5" />
                    Consolidated Executive Verdict
                  </div>
                  <p className="text-xs sm:text-sm text-blue-950 font-semibold leading-relaxed">
                    {critique.verdict}
                  </p>
                </div>

              </div>
            )}
          </motion.section>
        )}

      </main>

      {/* Footer Branding */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <p>© 2026 MockupCompare AI Comparison Suite.</p>
          <div className="flex gap-4">
            <span>Picsart: Real-time</span>
            <span>Photoroom: Instants</span>
            <span>Bria AI: Inpaint</span>
          </div>
        </div>
      </footer>

      {/* Full Resolution Overlay Modal */}
      <AnimatePresence>
        {modalImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4/20"
            onClick={() => setModalImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-4xl w-full flex flex-col space-y-3 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white flex items-center justify-between px-1">
                <span className="font-bold text-sm">{modalImage.title}</span>
                <button 
                  onClick={() => setModalImage(null)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold cursor-pointer text-white border border-white/5"
                >
                  Close
                </button>
              </div>
              <div className="bg-slate-900 rounded-2xl overflow-hidden max-h-[75vh] border border-white/10 flex items-center justify-center">
                <img 
                  src={modalImage.src} 
                  alt="Expanded view" 
                  className="max-h-[75vh] object-contain w-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
