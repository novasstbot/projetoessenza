"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ScanLine, X } from "lucide-react";
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

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

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

  function tryFocus() {
    const track = trackRef.current;
    if (!track) return;
    const capabilities = track.getCapabilities?.() as
      | (MediaTrackCapabilities & { focusMode?: string[] })
      | undefined;
    if (!capabilities?.focusMode?.includes("continuous")) return;
    track
      .applyConstraints({
        advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet],
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    lastCodeRef.current = null;
    stableCountRef.current = 0;

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
              Centralize o código de barras dentro da área marcada. Afaste um pouco a câmera até a
              imagem ficar nítida — se não focar, toque na tela.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : (
            <div
              className="relative overflow-hidden rounded-lg bg-black"
              onClick={tryFocus}
              role="presentation"
            >
              <video ref={videoRef} className="aspect-video w-full" muted playsInline />
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
