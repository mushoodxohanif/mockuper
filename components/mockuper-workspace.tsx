"use client";

import { useRef, useState } from "react";
import { GenerationControls } from "@/components/generation-controls";
import { ImageModal } from "@/components/image-modal";
import { ProductEditInstructions } from "@/components/product-edit-instructions";
import { ResultPanel } from "@/components/result-panel";
import { UploadAlerts } from "@/components/ui/upload-alerts";
import {
  getPerFileBudget,
  readFileAsDataUrl,
  validateImageType,
} from "@/components/ui/upload-utils";
import { MockupSwapInstructions, UploadMockupPanel } from "@/components/upload-mockup";
import { UploadProduct } from "@/components/upload-product";
import { UploadReferences } from "@/components/upload-references";
import { WorkflowTabs } from "@/components/workflow-tabs";
import { compressImageFile, formatFileSize } from "@/lib/compress-image-client";
import type { UploadLimitsResponse } from "@/lib/upload-limits";
import {
  emptyMockupResult,
  type GenerateMode,
  MAX_REFERENCE_IMAGES,
  type MockupResult,
  type ReferenceImage,
  type Workflow,
} from "@/types";

type MockuperWorkspaceProps = {
  initialLimits: UploadLimitsResponse;
};

export function MockuperWorkspace({ initialLimits }: MockuperWorkspaceProps) {
  const [workflow, setWorkflow] = useState<Workflow>("mockup");
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [mockupPreview, setMockupPreview] = useState<string | null>(null);
  const [mockupInstructions, setMockupInstructions] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [dragActiveReferences, setDragActiveReferences] = useState(false);
  const [generateMode, setGenerateMode] = useState<GenerateMode>("full");
  const [result, setResult] = useState<MockupResult>(emptyMockupResult());
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [modalClosing, setModalClosing] = useState(false);

  const productInputRef = useRef<HTMLInputElement>(null);
  const mockupInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [dragActiveProduct, setDragActiveProduct] = useState(false);
  const [dragActiveMockup, setDragActiveMockup] = useState(false);
  const [uploadLimits] = useState(initialLimits);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressingUpload, setCompressingUpload] = useState(false);
  const [compressionNotice, setCompressionNotice] = useState<string | null>(null);

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

  const resetResult = () => setResult(emptyMockupResult());

  const setFilePreview = (file: File, setPreview: (url: string | null) => void) => {
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getProductEditUploadCount = (referenceCount: number) => 1 + referenceCount;

  const prepareImageForUpload = async (file: File, otherFile: File | null): Promise<File> => {
    const fileCount = otherFile ? 2 : 1;
    const budget = getPerFileBudget(uploadLimits, fileCount);
    const { file: prepared, wasCompressed, originalSize } = await compressImageFile(file, budget);
    if (wasCompressed) {
      setCompressionNotice(
        `Compressed ${file.name} from ${formatFileSize(originalSize)} to ${formatFileSize(prepared.size)} for upload.`,
      );
    }
    return prepared;
  };

  const handleProductUpload = async (file: File) => {
    const typeError = validateImageType(file);
    if (typeError) {
      setUploadError(typeError);
      return;
    }

    setUploadError(null);
    setCompressingUpload(true);
    try {
      let pairedMockup = mockupFile;
      const mockupBudget = getPerFileBudget(uploadLimits, 2);
      if (pairedMockup && pairedMockup.size > mockupBudget) {
        const {
          file: resizedMockup,
          wasCompressed,
          originalSize,
        } = await compressImageFile(pairedMockup, mockupBudget);
        pairedMockup = resizedMockup;
        setMockupFile(resizedMockup);
        setFilePreview(resizedMockup, setMockupPreview);
        if (wasCompressed) {
          setCompressionNotice(
            `Compressed mockup from ${formatFileSize(originalSize)} to ${formatFileSize(resizedMockup.size)} so both images fit.`,
          );
        }
      }

      const fileCount =
        workflow === "product_edit"
          ? getProductEditUploadCount(referenceImages.length)
          : pairedMockup
            ? 2
            : 1;
      const budget = getPerFileBudget(uploadLimits, fileCount);
      const { file: prepared, wasCompressed, originalSize } = await compressImageFile(file, budget);
      if (wasCompressed) {
        setCompressionNotice(
          `Compressed ${file.name} from ${formatFileSize(originalSize)} to ${formatFileSize(prepared.size)} for upload.`,
        );
      }
      setProductFile(prepared);
      setFilePreview(prepared, setProductPreview);
      resetResult();
    } catch {
      setUploadError("Could not process that image. Try a different file or a smaller photo.");
    } finally {
      setCompressingUpload(false);
    }
  };

  const handleMockupUpload = async (file: File) => {
    const typeError = validateImageType(file);
    if (typeError) {
      setUploadError(typeError);
      return;
    }

    setUploadError(null);
    setCompressingUpload(true);
    try {
      let pairedProduct = productFile;
      const productBudget = getPerFileBudget(uploadLimits, 2);
      if (pairedProduct && pairedProduct.size > productBudget) {
        const {
          file: resizedProduct,
          wasCompressed,
          originalSize,
        } = await compressImageFile(pairedProduct, productBudget);
        pairedProduct = resizedProduct;
        setProductFile(resizedProduct);
        setFilePreview(resizedProduct, setProductPreview);
        if (wasCompressed) {
          setCompressionNotice(
            `Compressed product image from ${formatFileSize(originalSize)} to ${formatFileSize(resizedProduct.size)} so both images fit.`,
          );
        }
      }

      const prepared = await prepareImageForUpload(file, pairedProduct);
      setMockupFile(prepared);
      setFilePreview(prepared, setMockupPreview);
      resetResult();
    } catch {
      setUploadError("Could not process that image. Try a different file or a smaller photo.");
    } finally {
      setCompressingUpload(false);
    }
  };

  const clearProduct = () => {
    setCompressionNotice(null);
    setProductFile(null);
    setProductPreview(null);
    if (productInputRef.current) {
      productInputRef.current.value = "";
    }
  };

  const clearMockup = () => {
    setCompressionNotice(null);
    setMockupFile(null);
    setMockupPreview(null);
    if (mockupInputRef.current) {
      mockupInputRef.current.value = "";
    }
  };

  const clearReferenceImages = () => {
    setReferenceImages([]);
    if (referenceInputRef.current) {
      referenceInputRef.current.value = "";
    }
  };

  const removeReferenceImage = (id: string) => {
    setReferenceImages((prev) => prev.filter((item) => item.id !== id));
    resetResult();
  };

  const handleReferenceUpload = async (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    if (files.length === 0) {
      return;
    }

    const slotsLeft = MAX_REFERENCE_IMAGES - referenceImages.length;
    if (slotsLeft <= 0) {
      setUploadError(`You can add up to ${MAX_REFERENCE_IMAGES} reference images.`);
      return;
    }

    setUploadError(null);
    setCompressingUpload(true);
    try {
      const toAdd = files.slice(0, slotsLeft);
      const added: ReferenceImage[] = [];
      let referenceCount = referenceImages.length;

      for (const file of toAdd) {
        const typeError = validateImageType(file);
        if (typeError) {
          setUploadError(typeError);
          continue;
        }

        referenceCount += 1;
        const budget = getPerFileBudget(uploadLimits, getProductEditUploadCount(referenceCount));
        const {
          file: prepared,
          wasCompressed,
          originalSize,
        } = await compressImageFile(file, budget);
        if (wasCompressed) {
          setCompressionNotice(
            `Compressed ${file.name} from ${formatFileSize(originalSize)} to ${formatFileSize(prepared.size)} for upload.`,
          );
        }
        const preview = await readFileAsDataUrl(prepared);
        added.push({ id: crypto.randomUUID(), file: prepared, preview });
      }

      if (added.length > 0) {
        setReferenceImages((prev) => [...prev, ...added]);
        resetResult();
      }
    } catch {
      setUploadError("Could not process those images. Try smaller photos or fewer files.");
    } finally {
      setCompressingUpload(false);
      if (referenceInputRef.current) {
        referenceInputRef.current.value = "";
      }
    }
  };

  const runGeneration = async (
    endpoint: string,
    buildFormData: () => FormData,
    errorFallback: string,
  ) => {
    const startTime = Date.now();
    setResult({
      ...emptyMockupResult(),
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
              ? `Upload still too large after compression. Try smaller source images (${uploadLimits.maxTotalUploadLabel} combined on this host).`
              : `Upload still too large after compression. Try smaller images or fewer reference photos (${uploadLimits.maxTotalUploadLabel} combined on this host).`,
          );
        }
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
          usageId?: string | null;
        };
        setResult({
          ...emptyMockupResult(),
          error: errorData.error || `Request failed with status ${response.status}`,
          elapsedTime: finalTime,
          mode: generateMode,
          workflow,
          usageId: errorData.usageId ?? null,
        });
        return;
      }

      const data = (await response.json()) as {
        image?: string;
        instruction?: string;
        mode?: GenerateMode;
        usageId?: string | null;
      };
      setResult({
        imageUrl: data.image ?? null,
        loading: false,
        error: null,
        elapsedTime: finalTime,
        instruction: data.instruction ?? null,
        mode: data.mode ?? generateMode,
        workflow,
        usageId: data.usageId ?? null,
        feedbackSubmitted: false,
      });
    } catch (error: unknown) {
      clearInterval(interval);
      const finalTime = Number(((Date.now() - startTime) / 1000).toFixed(1));
      const message = error instanceof Error ? error.message : errorFallback;
      setResult({
        ...emptyMockupResult(),
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
    setUploadError(null);
    await runGeneration(
      "/api/process/mockup",
      () => {
        const formData = new FormData();
        formData.append("product", productFile);
        formData.append("mockup", mockupFile);
        const notes = mockupInstructions.trim();
        if (notes) {
          formData.append("instructions", notes);
        }
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
    setUploadError(null);
    await runGeneration(
      "/api/process/product-edit",
      () => {
        const formData = new FormData();
        formData.append("product", productFile);
        for (const reference of referenceImages) {
          formData.append("references", reference.file);
        }
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
    resetResult();
    if (next === "mockup") {
      clearReferenceImages();
    }
  };

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <WorkflowTabs workflow={workflow} onSwitch={switchWorkflow} />

      <UploadAlerts
        uploadLimits={uploadLimits}
        compressingUpload={compressingUpload}
        compressionNotice={compressionNotice}
        uploadError={uploadError}
      />

      <div
        className={`grid gap-6 ${workflow === "mockup" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
      >
        <UploadProduct
          compressing={compressingUpload}
          preview={productPreview}
          file={productFile}
          dragActive={dragActiveProduct}
          inputRef={productInputRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActiveProduct(true);
          }}
          onDragLeave={() => setDragActiveProduct(false)}
          onDrop={(file) => {
            setDragActiveProduct(false);
            void handleProductUpload(file);
          }}
          onBrowse={() => productInputRef.current?.click()}
          onClear={clearProduct}
          onChange={(file) => void handleProductUpload(file)}
        />

        {workflow === "mockup" ? (
          <UploadMockupPanel
            compressing={compressingUpload}
            preview={mockupPreview}
            file={mockupFile}
            dragActive={dragActiveMockup}
            inputRef={mockupInputRef}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActiveMockup(true);
            }}
            onDragLeave={() => setDragActiveMockup(false)}
            onDrop={(file) => {
              setDragActiveMockup(false);
              void handleMockupUpload(file);
            }}
            onBrowse={() => mockupInputRef.current?.click()}
            onClear={clearMockup}
            onChange={(file) => void handleMockupUpload(file)}
          />
        ) : (
          <ProductEditInstructions
            value={editInstructions}
            onChange={(value) => {
              setEditInstructions(value);
              resetResult();
            }}
          />
        )}
      </div>

      {workflow === "mockup" && (
        <MockupSwapInstructions
          value={mockupInstructions}
          onChange={(value) => {
            setMockupInstructions(value);
            resetResult();
          }}
        />
      )}

      {workflow === "product_edit" && (
        <UploadReferences
          compressing={compressingUpload}
          images={referenceImages}
          dragActive={dragActiveReferences}
          maxImages={MAX_REFERENCE_IMAGES}
          inputRef={referenceInputRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActiveReferences(true);
          }}
          onDragLeave={() => setDragActiveReferences(false)}
          onDrop={(files) => {
            setDragActiveReferences(false);
            void handleReferenceUpload(files);
          }}
          onBrowse={() => referenceInputRef.current?.click()}
          onClearAll={clearReferenceImages}
          onRemove={removeReferenceImage}
          onChange={(files) => void handleReferenceUpload(files)}
        />
      )}

      <GenerationControls
        workflow={workflow}
        generateMode={generateMode}
        canGenerate={canGenerate}
        onModeChange={setGenerateMode}
        onGenerate={handleGenerate}
      />

      <ResultPanel
        workflow={workflow}
        generateMode={generateMode}
        result={result}
        productPreview={productPreview}
        mockupPreview={mockupPreview}
        onExpandImage={setModalImage}
        onFeedbackSubmitted={() => setResult((prev) => ({ ...prev, feedbackSubmitted: true }))}
      />

      <ImageModal imageUrl={modalImage} closing={modalClosing} onClose={closeModal} />
    </main>
  );
}
