"use client";

import { useEffect, useRef, useState } from "react";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Decodifica por software (ZXing) em vez de depender da API nativa
// BarcodeDetector — que não existe no Safari/iOS e varia muito de
// qualidade entre fabricantes Android. Assim funciona em qualquer
// navegador com câmera, mesmo com a imagem um pouco fora de foco.
const HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

// Só a região dentro do guia visual é escaneada — evita pegar outro código
// de barras que esteja por perto, fora do quadro.
const CROP_WIDTH_RATIO = 0.85;
const CROP_HEIGHT_RATIO = 0.38;
// Quantas leituras seguidas do mesmo valor antes de aceitar — evita acertos
// falsos de um único frame borrado.
const FRAMES_PARA_CONFIRMAR = 3;

// Sem isso, alguns celulares não refocalizam depois do primeiro frame —
// a câmera fica parada na distância em que abriu.
function tryFocusContinuous(track: MediaStreamTrack | null) {
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

export function BarcodeScannerButton({ onDetected }: { onDetected: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastCodeRef = useRef<string | null>(null);
  const stableCountRef = useRef(0);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    lastCodeRef.current = null;
    stableCountRef.current = 0;
    readerRef.current = new BrowserMultiFormatReader(HINTS);

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
        tryFocusContinuous(stream.getVideoTracks()[0] ?? null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const loop = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const reader = readerRef.current;
          if (!video || !canvas || !reader || cancelled) return;

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
            const result = reader.decodeFromCanvas(canvas);
            const value = result.getText();

            if (value === lastCodeRef.current) {
              stableCountRef.current += 1;
            } else {
              lastCodeRef.current = value;
              stableCountRef.current = 1;
            }

            if (stableCountRef.current >= FRAMES_PARA_CONFIRMAR) {
              onDetected(value);
              setOpen(false);
              return;
            }
          } catch {
            // nenhum código encontrado nesse frame — tenta de novo no próximo
            lastCodeRef.current = null;
            stableCountRef.current = 0;
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
      readerRef.current = null;
    };
  }, [open, onDetected]);

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
              toque na tela.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : (
            <div
              className="relative aspect-video w-full overflow-hidden rounded-lg bg-black"
              onClick={() => tryFocusContinuous(streamRef.current?.getVideoTracks()[0] ?? null)}
              role="presentation"
            >
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
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
