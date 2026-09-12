// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Scan,
  AlertTriangle,
  Loader2,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PdfDocumentViewerProps {
  url: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

export const PdfDocumentViewer: React.FC<PdfDocumentViewerProps> = ({ url }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const heightsRef = useRef<Record<number, number>>({});

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scale, setScale] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Largura disponível (ajuste à largura)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const padding = el.clientWidth < 640 ? 16 : 48;
      setContainerWidth(Math.max(240, el.clientWidth - padding));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [reloadKey]);

  // Tela cheia
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (wrapperRef.current?.requestFullscreen) {
        await wrapperRef.current.requestFullscreen();
      }
    } catch {
      /* navegador sem suporte */
    }
  }, []);

  // Renderização sob demanda + página atual
  useEffect(() => {
    if (!numPages) return;
    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const page = Number((entry.target as HTMLElement).dataset.page);
            if (!page) continue;
            if (entry.isIntersecting) next.add(page);
            else next.delete(page);
          }
          return Array.from(next);
        });
      },
      { root, rootMargin: "300px 0px", threshold: 0 },
    );

    Object.values(pageRefs.current).forEach((el) => el && observer.observe(el));

    // Página atual pela posição da rolagem (mais estável que o observer)
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const top = root.scrollTop + root.clientHeight * 0.35;
        let atual = 1;
        for (let i = 1; i <= numPages; i += 1) {
          const el = pageRefs.current[i];
          if (el && el.offsetTop <= top) atual = i;
        }
        setCurrentPage(atual);
      });
    };
    root.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [numPages, reloadKey]);


  const pagesToRender = useMemo(() => {
    const set = new Set<number>();
    for (const p of visiblePages) {
      for (let i = p - 1; i <= p + 1; i += 1) {
        if (i >= 1 && i <= numPages) set.add(i);
      }
    }
    if (set.size === 0 && numPages > 0) set.add(1);
    return set;
  }, [visiblePages, numPages]);

  const goToPage = useCallback(
    (page: number) => {
      const target = Math.min(Math.max(page, 1), numPages || 1);
      const el = pageRefs.current[target];
      if (el && scrollRef.current) {
        scrollRef.current.scrollTo({ top: el.offsetTop - 12, behavior: "smooth" });
      }
      setCurrentPage(target);
    },
    [numPages],
  );

  const pageWidth = Math.round(containerWidth * scale);

  const handleRetry = () => {
    setLoadError(null);
    setNumPages(0);
    setVisiblePages([1]);
    setCurrentPage(1);
    pageRefs.current = {};
    heightsRef.current = {};
    setReloadKey((k) => k + 1);
  };

  const controlBtn =
    "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9";

  return (
    <div ref={wrapperRef} className="flex h-full min-h-0 w-full flex-col bg-slate-900">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-2 py-2 sm:px-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={controlBtn}
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[72px] text-center font-mono text-xs font-bold text-slate-300">
            {numPages ? `${currentPage} / ${numPages}` : "--"}
          </span>
          <button
            type="button"
            className={controlBtn}
            onClick={() => goToPage(currentPage + 1)}
            disabled={!numPages || currentPage >= numPages}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={controlBtn}
            onClick={() => setScale((s) => Math.max(MIN_SCALE, Number((s - 0.25).toFixed(2))))}
            disabled={scale <= MIN_SCALE}
            aria-label="Reduzir zoom"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="min-w-[52px] text-center font-mono text-xs font-bold text-slate-300">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className={controlBtn}
            onClick={() => setScale((s) => Math.min(MAX_SCALE, Number((s + 0.25).toFixed(2))))}
            disabled={scale >= MAX_SCALE}
            aria-label="Aumentar zoom"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            className={controlBtn}
            onClick={() => setScale(1)}
            aria-label="Ajustar à largura"
            title="Ajustar à largura"
          >
            <Scan className="h-5 w-5" />
          </button>
          <button
            type="button"
            className={controlBtn}
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain bg-slate-800 px-2 py-3 sm:px-6 sm:py-6"
      >
        {loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
              Não foi possível carregar o documento
            </h3>
            <p className="max-w-md text-xs text-slate-400">{loadError}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-emerald-500"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        ) : (
          <Document
            key={reloadKey}
            file={url}
            onLoadSuccess={({ numPages: total }) => {
              setNumPages(total);
              setLoadError(null);
            }}
            onLoadError={(err: any) =>
              setLoadError(err?.message || "Verifique sua conexão e tente novamente.")
            }
            loading={
              <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">
                  Carregando laudo oficial...
                </span>
              </div>
            }
            error={null}
            className="flex flex-col items-center gap-4"
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
              <div
                key={pageNumber}
                data-page={pageNumber}
                ref={(el) => {
                  pageRefs.current[pageNumber] = el;
                }}
                className="overflow-hidden rounded-lg bg-white shadow-xl"
                style={
                  pagesToRender.has(pageNumber)
                    ? undefined
                    : {
                        width: pageWidth || "100%",
                        height: heightsRef.current[pageNumber] || (pageWidth || 600) * 1.414,
                      }
                }
              >
                {pagesToRender.has(pageNumber) && pageWidth > 0 ? (
                  <Page
                    pageNumber={pageNumber}
                    width={pageWidth}
                    renderAnnotationLayer={false}
                    renderTextLayer
                    onRenderSuccess={() => {
                      const el = pageRefs.current[pageNumber];
                      if (el) heightsRef.current[pageNumber] = el.offsetHeight;
                    }}
                    loading={
                      <div
                        className="flex items-center justify-center bg-slate-100"
                        style={{ width: pageWidth, height: pageWidth * 1.414 }}
                      >
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      </div>
                    }
                  />
                ) : null}
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  );
};

export default PdfDocumentViewer;
