"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  enableContinuousFocus,
  getEffectiveResolution,
  startRearCamera,
  type RearCamera,
} from "@/lib/barcode/camera";
import { createNativeBarcodeDecoder, type BarcodeDecoder } from "@/lib/barcode/decoder";

// Só a região dentro do guia visual é escaneada — evita pegar outro código
// de barras que esteja por perto, fora do quadro.
const CROP_WIDTH_RATIO = 0.85;
const CROP_HEIGHT_RATIO = 0.38;
// Quantas leituras seguidas do mesmo valor antes de aceitar — evita acertos
// falsos de um único frame borrado.
const FRAMES_PARA_CONFIRMAR = 3;

export function BarcodeScannerButton({ onDetected }: { onDetected: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Diagnóstico temporário enquanto investigamos o foco da câmera — mostra
  // a resolução efetiva do vídeo e os formatos de fato suportados.
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<RearCamera | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastCodeRef = useRef<string | null>(null);
  const stableCountRef = useRef(0);

  function tryFocus() {
    enableContinuousFocus(cameraRef.current?.track ?? null);
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    lastCodeRef.current = null;
    stableCountRef.current = 0;

    async function start() {
      let decoder: BarcodeDecoder | null;
      try {
        decoder = await createNativeBarcodeDecoder();
      } catch {
        decoder = null;
      }
      if (cancelled) return;
      if (!decoder) {
        setError("Este navegador não tem leitura de código de barras (EAN) disponível.");
        return;
      }

      try {
        const camera = await startRearCamera();
        if (cancelled) {
          camera.stop();
          return;
        }
        cameraRef.current = camera;
        enableContinuousFocus(camera.track);

        if (videoRef.current) {
          videoRef.current.srcObject = camera.stream;
          await videoRef.current.play();
        }

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

          const resolucao = getEffectiveResolution(video);
          if (resolucao) {
            setDebugInfo(
              `${resolucao.width}×${resolucao.height} · formatos: ${decoder!.supportedFormats.join(", ")}`,
            );
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
            const value = await decoder!.decode(canvas);

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
            // erros de decodificação pontuais são esperados entre frames
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
      cameraRef.current?.stop();
      cameraRef.current = null;
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
              onClick={tryFocus}
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
              {debugInfo ? (
                <p className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
                  {debugInfo}
                </p>
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
