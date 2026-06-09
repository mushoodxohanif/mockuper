"use client";

import { Check, Lasso, MapPin, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageAnnotation, ImageAnnotationPoint } from "@/types";

type EditorTool = "marker" | "selection";

type ImageAnnotationEditorProps = {
  imageUrl: string;
  annotations: ImageAnnotation[];
  onSave: (annotations: ImageAnnotation[]) => void;
  onClose: () => void;
};

type ImageMetrics = {
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  offsetX: number;
  offsetY: number;
};

const MIN_SELECTION_POINTS = 6;

function simplifyPoints(points: ImageAnnotationPoint[], maxPoints = 80): ImageAnnotationPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }
  const step = Math.ceil(points.length / maxPoints);
  const simplified: ImageAnnotationPoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    simplified.push(points[i]);
  }
  const last = points[points.length - 1];
  if (simplified[simplified.length - 1] !== last) {
    simplified.push(last);
  }
  return simplified;
}

function pointsToPolygon(points: ImageAnnotationPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function getImageMetrics(container: HTMLDivElement, image: HTMLImageElement): ImageMetrics | null {
  const containerRect = container.getBoundingClientRect();
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (!naturalWidth || !naturalHeight) {
    return null;
  }

  const scale = Math.min(containerRect.width / naturalWidth, containerRect.height / naturalHeight);
  const displayWidth = naturalWidth * scale;
  const displayHeight = naturalHeight * scale;
  const offsetX = (containerRect.width - displayWidth) / 2;
  const offsetY = (containerRect.height - displayHeight) / 2;

  return {
    naturalWidth,
    naturalHeight,
    displayWidth,
    displayHeight,
    offsetX,
    offsetY,
  };
}

function clientToNormalized(
  clientX: number,
  clientY: number,
  container: HTMLDivElement,
  metrics: ImageMetrics,
): ImageAnnotationPoint | null {
  const rect = container.getBoundingClientRect();
  const localX = clientX - rect.left - metrics.offsetX;
  const localY = clientY - rect.top - metrics.offsetY;

  if (localX < 0 || localY < 0 || localX > metrics.displayWidth || localY > metrics.displayHeight) {
    return null;
  }

  return {
    x: localX / metrics.displayWidth,
    y: localY / metrics.displayHeight,
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function ImageAnnotationEditor({
  imageUrl,
  annotations: initialAnnotations,
  onSave,
  onClose,
}: ImageAnnotationEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [annotations, setAnnotations] = useState<ImageAnnotation[]>(initialAnnotations);
  const [tool, setTool] = useState<EditorTool>("marker");
  const [selectedId, setSelectedId] = useState<string | null>(initialAnnotations[0]?.id ?? null);
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);
  const [draftPoints, setDraftPoints] = useState<ImageAnnotationPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [markerPressPoint, setMarkerPressPoint] = useState<ImageAnnotationPoint | null>(null);
  const [closing, setClosing] = useState(false);

  const updateMetrics = useCallback(() => {
    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image) {
      return;
    }
    const next = getImageMetrics(container, image);
    if (next) {
      setMetrics(next);
    }
  }, []);

  useEffect(() => {
    updateMetrics();
    const onResize = () => updateMetrics();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateMetrics]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleClose = () => {
    if (closing) {
      return;
    }
    setClosing(true);
    window.setTimeout(() => onClose(), 200);
  };

  const handleSave = () => {
    onSave(annotations);
    handleClose();
  };

  const addMarker = (point: ImageAnnotationPoint) => {
    const id = crypto.randomUUID();
    const next: ImageAnnotation = {
      id,
      type: "marker",
      note: "",
      x: point.x,
      y: point.y,
    };
    setAnnotations((prev) => [...prev, next]);
    setSelectedId(id);
  };

  const addSelection = (points: ImageAnnotationPoint[]) => {
    const id = crypto.randomUUID();
    const next: ImageAnnotation = {
      id,
      type: "selection",
      note: "",
      points,
    };
    setAnnotations((prev) => [...prev, next]);
    setSelectedId(id);
  };

  const removeAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((item) => item.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  };

  const updateNote = (id: string, note: string) => {
    setAnnotations((prev) => prev.map((item) => (item.id === id ? { ...item, note } : item)));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !metrics) {
      return;
    }
    const point = clientToNormalized(event.clientX, event.clientY, container, metrics);
    if (!point) {
      return;
    }

    if (tool === "marker") {
      setMarkerPressPoint(point);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    setDraftPoints([point]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !metrics || !isDrawing || tool !== "selection") {
      return;
    }
    const point = clientToNormalized(event.clientX, event.clientY, container, metrics);
    if (!point) {
      return;
    }
    setDraftPoints((prev) => {
      const last = prev[prev.length - 1];
      if (!last) {
        return [point];
      }
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx * dx + dy * dy < 0.00002) {
        return prev;
      }
      return [...prev, point];
    });
  };

  const finishSelection = () => {
    if (draftPoints.length >= MIN_SELECTION_POINTS) {
      addSelection(simplifyPoints(draftPoints));
    }
    setDraftPoints([]);
    setIsDrawing(false);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !metrics) {
      return;
    }

    if (tool === "marker" && markerPressPoint) {
      const point = clientToNormalized(event.clientX, event.clientY, container, metrics);
      if (point) {
        const dx = point.x - markerPressPoint.x;
        const dy = point.y - markerPressPoint.y;
        if (dx * dx + dy * dy < 0.00005) {
          addMarker(point);
        }
      }
      setMarkerPressPoint(null);
      return;
    }

    if (!isDrawing || tool !== "selection") {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishSelection();
  };

  const selectedAnnotation = annotations.find((item) => item.id === selectedId) ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image annotation editor"
      className={`fixed inset-0 z-50 flex bg-slate-950/95 backdrop-blur-md ${
        closing ? "animate-modal-fade-out" : "animate-modal-fade-in"
      }`}
    >
      <div className="flex flex-1 flex-col lg:flex-row min-h-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 lg:hidden">
          <p className="text-sm font-semibold text-white">Annotate product image</p>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 flex-col p-4 lg:p-6">
          <div className="mb-4 hidden items-center justify-between lg:flex">
            <div>
              <h2 className="text-lg font-bold text-white">Annotate product image</h2>
              <p className="text-sm text-slate-400">
                Place markers or draw around areas, then add notes for each.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Close editor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTool("marker")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tool === "marker"
                  ? "bg-violet-600 text-white"
                  : "bg-white/10 text-slate-200 hover:bg-white/15"
              }`}
            >
              <MapPin className="h-4 w-4" />
              Marker
            </button>
            <button
              type="button"
              onClick={() => setTool("selection")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tool === "selection"
                  ? "bg-violet-600 text-white"
                  : "bg-white/10 text-slate-200 hover:bg-white/15"
              }`}
            >
              <Lasso className="h-4 w-4" />
              Free select
            </button>
            <p className="text-xs text-slate-400 ml-1">
              {tool === "marker"
                ? "Click on the image to place a marker."
                : "Click and drag to outline an area."}
            </p>
          </div>

          <div
            ref={containerRef}
            role="application"
            aria-label="Image annotation canvas"
            className={`relative flex-1 min-h-[280px] rounded-xl border border-white/10 bg-black/40 overflow-hidden ${
              tool === "marker" ? "cursor-crosshair" : "cursor-cell"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={finishSelection}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Product to annotate"
              className="absolute inset-0 h-full w-full object-contain select-none pointer-events-none"
              onLoad={updateMetrics}
              draggable={false}
            />

            {metrics && (
              <svg
                aria-hidden="true"
                className="absolute pointer-events-none"
                focusable="false"
                style={{
                  left: metrics.offsetX,
                  top: metrics.offsetY,
                  width: metrics.displayWidth,
                  height: metrics.displayHeight,
                }}
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
              >
                <title>Annotation overlay</title>
                {annotations.map((annotation, index) => {
                  const isSelected = annotation.id === selectedId;
                  const color = isSelected ? "#a78bfa" : "#f472b6";
                  const fill = isSelected ? "rgba(167,139,250,0.25)" : "rgba(244,114,182,0.18)";

                  if (
                    annotation.type === "marker" &&
                    annotation.x != null &&
                    annotation.y != null
                  ) {
                    return (
                      <g key={annotation.id}>
                        <circle
                          cx={annotation.x}
                          cy={annotation.y}
                          r={0.018}
                          fill={color}
                          stroke="white"
                          strokeWidth={0.003}
                        />
                        <text
                          x={annotation.x + 0.022}
                          y={annotation.y + 0.006}
                          fill="white"
                          fontSize={0.028}
                          fontWeight="700"
                        >
                          {index + 1}
                        </text>
                      </g>
                    );
                  }

                  if (annotation.type === "selection" && annotation.points?.length) {
                    return (
                      <g key={annotation.id}>
                        <polygon
                          points={pointsToPolygon(annotation.points)}
                          fill={fill}
                          stroke={color}
                          strokeWidth={0.003}
                          strokeDasharray={isSelected ? undefined : "0.01 0.008"}
                        />
                        <text
                          x={annotation.points[0].x + 0.01}
                          y={annotation.points[0].y + 0.01}
                          fill="white"
                          fontSize={0.028}
                          fontWeight="700"
                        >
                          {index + 1}
                        </text>
                      </g>
                    );
                  }

                  return null;
                })}

                {draftPoints.length > 1 && (
                  <polyline
                    points={pointsToPolygon(draftPoints)}
                    fill="rgba(167,139,250,0.12)"
                    stroke="#c4b5fd"
                    strokeWidth={0.003}
                  />
                )}
              </svg>
            )}
          </div>
        </div>

        <aside className="flex w-full lg:w-80 xl:w-96 flex-col border-t lg:border-t-0 lg:border-l border-white/10 bg-slate-900/80">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-sm font-semibold text-white">Annotations ({annotations.length})</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {annotations.length === 0 ? (
              <p className="text-sm text-slate-400 leading-relaxed">
                No annotations yet. Use markers for single points or free select to outline regions.
              </p>
            ) : (
              annotations.map((annotation, index) => {
                const isSelected = annotation.id === selectedId;
                const locationLabel =
                  annotation.type === "marker" && annotation.x != null && annotation.y != null
                    ? `Point at ${formatPercent(annotation.x)} left, ${formatPercent(annotation.y)} top`
                    : `Selected region (${annotation.points?.length ?? 0} points)`;

                return (
                  <div
                    key={annotation.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      isSelected
                        ? "border-violet-400/60 bg-violet-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(annotation.id)}
                        className="flex-1 text-left"
                      >
                        <p className="text-xs font-semibold text-white">
                          {index + 1}. {annotation.type === "marker" ? "Marker" : "Selection"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{locationLabel}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAnnotation(annotation.id)}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                        aria-label={`Remove annotation ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isSelected && (
                      <textarea
                        value={annotation.note}
                        onChange={(event) => updateNote(annotation.id, event.target.value)}
                        placeholder="What should change here?"
                        rows={3}
                        className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {selectedAnnotation && (
            <div className="border-t border-white/10 p-4">
              <label
                htmlFor="annotation-note"
                className="text-xs font-semibold text-slate-300 mb-2 block"
              >
                Note for selected annotation
              </label>
              <textarea
                id="annotation-note"
                value={selectedAnnotation.note}
                onChange={(event) => updateNote(selectedAnnotation.id, event.target.value)}
                placeholder="Describe the edit for this spot or region..."
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
          )}

          <div className="border-t border-white/10 p-4 flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
