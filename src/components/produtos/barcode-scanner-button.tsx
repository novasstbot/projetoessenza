"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ScanLine, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Native BarcodeDetector isn't in the DOM lib typings yet.
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

type TrackCapabilitiesExt = MediaTrackCapabilities & {
  focusMode?: string[];
  focusDistance?: { min: number; max: number; step: number };
  zoom?: { min: number; max: number; step: number };
};

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

// No celular, a câmera traseira costuma abrir no ângulo mais aberto e só
// focaliza de uma certa distância em diante — perto demais, o código de
// barras fica borrado. Um zoom digital leve compensa isso: o código fica
// maior no quadro sem precisar aproximar além da distância mínima de foco.
// Um incremento fixo (em vez de uma fração do range) evita exagerar em
// celulares cujo "zoom" vai muito além de 1x-8x.
const ZOOM_INICIAL_INCREMENTO = 1;

// Só a região dentro do guia visual é escaneada — evita pegar outro código
// de barras que esteja por perto, fora do quadro.
const CROP_WIDTH_RATIO = 0.85;
const CROP_HEIGHT_RATIO = 0.38;
// Quantas leituras seguidas do mesmo valor antes de aceitar — evita acertos
// falsos de um único frame borrado.
const FRAMES_PARA_CONFIRMAR = 3;

function subscribeNever() {
  return () => {};
}
function getSupportSnapshot() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}
function getServerSupportSnapshot() {
  return false;
}

export function BarcodeScannerButton({ onDetected }: { onDetected: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = useSyncExternalStore(
    subscribeNever,
    getSupportSnapshot,
    getServerSupportSnapshot,
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastCodeRef = useRef<string | null>(null);
  const stableCountRef = useRef(0);
  const zoomRangeRef = useRef<{ min: number; max: number; step: number } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  function tryFocus() {
    const track = trackRef.current;
    if (!track) return;
    const capabilities = track.getCapabilities?.() as TrackCapabilitiesExt | undefined;
    if (!capabilities) return;

    // "continuous" sozinho raramente foca em algo tão próximo quanto um
    // código de barras — o foco manual fixado na distância mínima força o
    // comportamento de macro que esse caso precisa.
    if (capabilities.focusMode?.includes("manual") && capabilities.focusDistance) {
      track
        .applyConstraints({
          advanced: [
            {
              focusMode: "manual",
              focusDistance: capabilities.focusDistance.min,
            } as unknown as MediaTrackConstraintSet,
          ],
        })
        .catch(() => {});
      return;
    }

    if (capabilities.focusMode?.includes("continuous")) {
      track
        .applyConstraints({
          advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet],
        })
        .catch(() => {});
    }
  }

  function applyZoom(value: number) {
    const track = trackRef.current;
    const range = zoomRangeRef.current;
    if (!track || !range) return;
    const clamped = Math.min(range.max, Math.max(range.min, value));
    track
      .applyConstraints({ advanced: [{ zoom: clamped } as unknown as MediaTrackConstraintSet] })
      .then(() => setZoom(clamped))
      .catch(() => {});
  }

  function adjustZoom(direction: 1 | -1) {
    const range = zoomRangeRef.current;
    if (!range || zoom == null) return;
    const step = range.step || (range.max - range.min) / 10 || 0.5;
    applyZoom(zoom + direction * step);
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    lastCodeRef.current = null;
    stableCountRef.current = 0;
    zoomRangeRef.current = null;
    setZoom(null);

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        trackRef.current = stream.getVideoTracks()[0] ?? null;
        tryFocus();

        const capabilities = trackRef.current?.getCapabilities?.() as
          | TrackCapabilitiesExt
          | undefined;
        if (capabilities?.zoom) {
          const { min, max, step } = capabilities.zoom;
          zoomRangeRef.current = { min, max, step };
          applyZoom(min + ZOOM_INICIAL_INCREMENTO);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new window.BarcodeDetector!({ formats: FORMATS });

        const loop = async () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || cancelled) return;

          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (!vw || !vh) {
            frameRef.current = requestAnimationFrame(loop);
            return;
          }

          const sw = vw * CROP_WIDTH_RATIO;
          const sh = vh * CROP_HEIGHT_RATIO;
          const sx = (vw - sw) / 2;
          const sy = (vh - sh) / 2;

          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

          try {
            const codes = await detector.detect(canvas);
            const value = codes[0]?.rawValue ?? null;

            if (value && value === lastCodeRef.current) {
              stableCountRef.current += 1;
            } else {
              lastCodeRef.current = value;
              stableCountRef.current = value ? 1 : 0;
            }

            if (value && stableCountRef.current >= FRAMES_PARA_CONFIRMAR) {
              onDetected(value);
              setOpen(false);
              return;
            }
          } catch {
            // transient decode errors are expected between frames
          }
          frameRef.current = requestAnimationFrame(loop);
        };
        frameRef.current = requestAnimationFrame(loop);
      } catch {
        if (!cancelled) setError("Não foi possível acessar a câmera.");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      trackRef.current = null;
    };
  }, [open, onDetected]);

  if (!supported) return null;

  const marginX = ((1 - CROP_WIDTH_RATIO) / 2) * 100;
  const marginY = ((1 - CROP_HEIGHT_RATIO) / 2) * 100;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Ler código de barras pela câmera"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <ScanLine className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ler código de barras</DialogTitle>
            <DialogDescription>
              Centralize o código de barras dentro da área marcada. Se a imagem não focalizar,
              toque na tela ou use os botões de zoom.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : (
            <div
              className="relative aspect-video w-full overflow-hidden rounded-lg bg-black"
              onClick={tryFocus}
              role="presentation"
            >
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              <div
                className="pointer-events-none absolute rounded-lg border-2 border-gold"
                style={{
                  left: `${marginX}%`,
                  right: `${marginX}%`,
                  top: `${marginY}%`,
                  bottom: `${marginY}%`,
                }}
              />
              {zoom != null ? (
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-2 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-white hover:bg-white/20 hover:text-white"
                    aria-label="Diminuir zoom"
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustZoom(-1);
                    }}
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-white hover:bg-white/20 hover:text-white"
                    aria-label="Aumentar zoom"
                    onClick={(e) => {
                      e.stopPropagation();
                      adjustZoom(1);
                    }}
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          )}
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="gap-1.5">
            <X className="size-4" />
            Cancelar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
